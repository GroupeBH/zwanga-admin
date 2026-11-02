const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
function load(file, customRequire = require) {
  const exports = {};
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(exports, customRequire);
  return exports;
}
const policy = load('directPayout.ts');
const errors = load('../../utils/apiErrors.ts');
const input = { phone: '+243891234567', amount: '10000', reason: 'Synthetic treasury transfer' };
const result = { ...input, amount: 10000, id: 'payment', reference: 'test', status: 'pending', currency: 'CDF' };
const settle = () => new Promise(resolve => setImmediate(resolve));
test('validates amount, phone and mandatory reason without treating unavailable as zero', () => {
  assert.equal(policy.directPayoutInputError(input.phone, input.amount, input.reason), null);
  for (const amount of ['', '-1', '0', '1.001', 'NaN', '1e3', '999999999']) assert.ok(policy.directPayoutInputError(input.phone, amount, input.reason));
  for (const phone of ['', '+243111111111', 'bad']) assert.ok(policy.directPayoutInputError(phone, input.amount, input.reason));
  assert.ok(policy.directPayoutInputError(input.phone, input.amount, '    '));
  assert.notEqual(policy.directPayoutStorageKey('a'), policy.directPayoutStorageKey('b'));
});
test('only a succeeded provider status is shown as confirmed', () => {
  for (const status of ['pending','initiated', undefined]) assert.match(policy.directPayoutStatusMessage(status), /non confirmé/);
  for (const status of ['failed','cancelled']) assert.match(policy.directPayoutStatusMessage(status), /échoué ou annulé/);
  assert.match(policy.directPayoutStatusMessage('succeeded'), /confirmé par le prestataire/);
});
let endpoints;
load('directPayoutApi.ts', name => {
  assert.equal(name, '../api/baseApi');
  return { baseApi: { injectEndpoints({ endpoints: build }) { endpoints = build({ mutation: x => x, query: x => x }); return {}; } } };
});
test('API has separate create/read routes and invalidates payment history', () => {
  const body = { ...input, amount: 10000, currency: 'CDF', idempotencyKey: 'intent', confirmed: true };
  assert.deepEqual(endpoints.createDirectPayout.query(body), { url: '/admin/payments/direct-payouts', method: 'POST', body });
  assert.equal(endpoints.getDirectPayout.query('bad/key'), '/admin/payments/direct-payouts/bad%2Fkey');
  assert.equal(endpoints.getDirectPayout.keepUnusedDataFor, 0);
  assert.ok(endpoints.createDirectPayout.invalidatesTags.includes('Payments'));
});

function harness(t, { role = 'super_admin', savedKey, failure, pending, output = result, lookupFailure } = {}) {
  const originals = Object.fromEntries(['window','document','sessionStorage'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  const storage = new Map(savedKey ? [[policy.directPayoutStorageKey('actor'), savedKey]] : []);
  const confirmations = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { confirm: message => { confirmations.push(message); return true; } } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { activeElement: null } });
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) } });
  t.after(() => { for (const [k,v] of Object.entries(originals)) { if (v) Object.defineProperty(globalThis,k,v); else delete globalThis[k]; } });
  const slots = [], effects = [], creates = [], reads = [], checks = [], closes = [];
  let cursor = 0, mounted = false;
  const lookup = key => ({ unwrap: async () => { reads.push(key); if (lookupFailure) throw lookupFailure; return output; } });
  const create = body => ({ unwrap: async () => { creates.push(body); if (pending) await pending; if (failure) throw failure; return output; } });
  const Component = load('../../../app/(admin)/payments/DirectPayoutDrawer.tsx', name => {
    if (name === 'react') return { ...React, useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v; }]; },
      useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; }, useEffect: effect => { if (!mounted) effects.push(effect); } };
    if (name.endsWith('/profileApi')) return { useGetCurrentUserProfileQuery: () => ({ data: { user: { id: 'actor', role } } }) };
    if (name.endsWith('/directPayoutApi')) return { useCreateDirectPayoutMutation: () => [create], useLazyGetDirectPayoutQuery: () => [lookup] };
    if (name.endsWith('/directPayout')) return policy;
    if (name.endsWith('/financeApi')) return { useReconcileAdminPaymentMutation: () => [id => ({ unwrap: async () => { checks.push(id); return {}; } })] };
    if (name.endsWith('/format')) return { financeLabel: x => x, formatMoney: (amount,currency) => `${amount} ${currency}` };
    if (name.endsWith('/apiErrors')) return errors;
    if (name.endsWith('.css')) return { default: new Proxy({}, { get: (_, key) => key }) };
    return require(name);
  }).DirectPayoutDrawer;
  const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
  const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
  const render = () => { cursor = 0; return all(Component({ onClose: () => closes.push(true) })); };
  return { creates, reads, checks, closes, storage, confirmations, render,
    mount: async () => { render(); mounted = true; for (const effect of effects) effect(); await settle(); },
    button: label => render().find(e => e.type === 'button' && (text(e).includes(label) || e.props['aria-label'] === label)),
    fill: () => {
      render().find(e => e.type === 'input' && e.props.placeholder).props.onChange({ target: { value: input.phone } });
      render().find(e => e.type === 'input' && e.props.type === 'number').props.onChange({ target: { value: input.amount } });
      render().find(e => e.type === 'textarea').props.onChange({ target: { value: input.reason } });
      render().find(e => e.type === 'input' && e.props.type === 'checkbox').props.onChange({ target: { checked: true } });
    },
    submit: () => render().find(e => e.type === 'form').props.onSubmit({ preventDefault() {} }),
  };
}
test('ordinary admins cannot display or initiate treasury transfers', async t => {
  const f = harness(t, { role: 'admin' }); await f.mount();
  assert.equal(f.render().some(e => e.type === 'form'), false); assert.equal(f.creates.length, 0);
});
test('double submit sends once; amount and recipient require confirmation, key alone is persisted', async t => {
  let release; const f = harness(t, { pending: new Promise(resolve => { release = resolve; }) }); await f.mount(); f.fill();
  const submit = f.render().find(e => e.type === 'form').props.onSubmit;
  submit({ preventDefault() {} }); submit({ preventDefault() {} }); await settle();
  assert.equal(f.creates.length, 1); assert.match(f.confirmations[0], /10000 CDF.*\+243891234567/);
  assert.deepEqual([...f.storage.values()], [f.creates[0].idempotencyKey]);
  f.button('Fermer').props.onClick(); assert.equal(f.closes.length, 0);
  release(); await settle(); assert.equal(f.render().some(e => e.type === 'form'), false);
  assert.equal(f.button('Nouveau virement distinct'), undefined);
});
test('lost reply preserves the key and only an explicit resume uses that same key', async t => {
  const f = harness(t, { failure: { status: 'FETCH_ERROR' }, lookupFailure: { status: 404 } }); await f.mount(); f.fill(); f.submit(); await settle();
  const key = f.creates[0].idempotencyKey;
  await f.button('Vérifier sans').props.onClick(); assert.deepEqual(f.reads, [key]); assert.equal(f.creates.length, 1);
  f.button('Reprendre le même ordre').props.onClick(); f.fill(); f.submit(); await settle();
  assert.equal(f.creates[1].idempotencyKey, key); assert.equal(f.storage.size, 1);
});
test('reopening a drawer with a remembered key never sends automatically', async t => {
  const f = harness(t, { savedKey: 'existing-intent' }); await f.mount();
  assert.deepEqual(f.reads, ['existing-intent']); assert.equal(f.creates.length, 0);
  await f.button('Vérifier sans').props.onClick(); assert.equal(f.creates.length, 0); assert.deepEqual(f.checks, ['payment']);
});
test('only a terminal result allows an explicit distinct order and clears the old form', async t => {
  const f = harness(t, { output: { ...result, status: 'failed' } }); await f.mount(); f.fill(); f.submit(); await settle();
  assert.ok(f.button('Nouveau virement distinct')); f.button('Nouveau virement distinct').props.onClick();
  assert.equal(f.storage.size, 0); assert.equal(f.creates.length, 1); assert.ok(f.render().some(e => e.type === 'form'));
});
