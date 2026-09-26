const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');
function loader() {
  return filename => {
    const absolute = path.resolve(__dirname, '../../..', filename);
    const module = { exports: {} };
    const output = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: absolute,
    }).outputText;
    new Function('require', 'module', 'exports', output)(createRequire(absolute), module, module.exports);
    return module.exports;
  };
}

const payload = { serviceCode: 'documents', contactConsent: true, submissionKey: '00000000-0000-4000-8000-000000000001',
  application: { fullName: 'Test applicant', phone: '+0000000000', vehicleDescription: '', documents: ['carte-rose'], description: '' } };
function request(body, origin = 'https://web.example') {
  return Object.assign(new Request('https://web.example/api/demandes', { method: 'POST', headers: { origin }, body: typeof body === 'string' ? body : JSON.stringify(body) }), { nextUrl: new URL('https://web.example/api/demandes') });
}
async function withProxy(callback) {
  const previousFetch = global.fetch, previousBase = process.env.NEXT_PUBLIC_API_PUBLIC_URL;
  process.env.NEXT_PUBLIC_API_PUBLIC_URL = 'https://api.example/api/v1';
  const calls = [];
  global.fetch = async (url, options) => { calls.push({ url: String(url), options }); return Response.json({ id: 'case-test' }); };
  try { await callback(loader()('app/api/demandes/route.ts'), calls); }
  finally { global.fetch = previousFetch; if (previousBase === undefined) delete process.env.NEXT_PUBLIC_API_PUBLIC_URL; else process.env.NEXT_PUBLIC_API_PUBLIC_URL = previousBase; }
}
test('web requests reach the shared backend with the same idempotency key and no payment', () => withProxy(async (route, calls) => {
  const result = await route.POST(request(payload));
  assert.equal(result.status, 201); assert.deepEqual(await result.json(), { id: 'case-test' });
  assert.equal(calls[0].url, 'https://api.example/api/v1/pro-services/public-applications');
  assert.equal(JSON.parse(calls[0].options.body).submissionKey, payload.submissionKey);
  assert.equal(calls.length, 1); assert.equal(calls[0].options.cache, 'no-store');
}));
test('web proxy rejects missing consent, cross-origin requests and oversized bodies without forwarding', () => withProxy(async (route, calls) => {
  assert.equal((await route.POST(request({ ...payload, contactConsent: false }))).status, 400);
  assert.equal((await route.POST(request(payload, 'https://other.example'))).status, 403);
  assert.equal((await route.POST(request('x'.repeat(16001)))).status, 413);
  assert.equal(calls.length, 0);
}));
test('backend rejection is visible and uncertain sends never fall back to the legacy database', () => withProxy(async route => {
  global.fetch = async () => Response.json({ message: 'Service en pause' }, { status: 409 });
  const refused = await route.POST(request(payload));
  assert.equal(refused.status, 409); assert.equal((await refused.json()).message, 'Service en pause');
  global.fetch = async () => { throw new Error('Synthetic connection error'); };
  const uncertain = await route.POST(request(payload));
  assert.equal(uncertain.status, 503); assert.match((await uncertain.json()).message, /mêmes informations/);
}));
test('administrator money parsing uses exact minor units', () => {
  const { minor } = loader()('lib/features/proServices/types.ts');
  assert.equal(minor('1500,25'), 150025);
  assert.equal(minor('0.01'), 1);
  assert.equal(minor('0'), 0);
  for (const value of ['NaN', '-10', '1.001', '1e6', '100000000']) assert.throws(() => minor(value));
});
test('browser timeout unlocks the form without an automatic duplicate request', async t => {
  const previousFetch = global.fetch;
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  global.fetch = async (_url, options) => {
    calls++;
    return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true }));
  };
  try {
    const { publicServiceRequest } = loader()('lib/features/proServices/publicRequest.ts');
    const pending = publicServiceRequest(new AbortController().signal);
    const check = assert.rejects(pending, /Connexion trop lente/);
    t.mock.timers.tick(20000);
    await check;
    assert.equal(calls, 1);
  } finally { global.fetch = previousFetch; t.mock.timers.reset(); }
});
