const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../../..');

function workspace(status, failure) {
  const calls = [];
  const cache = new Map();
  const pageData = { items: [], page: 1, limit: 25, hasMore: false };
  const queries = {
    useGetMobilePoliciesQuery: () => ({ currentData: pageData }),
    useGetMobileReleasesQuery: () => ({ currentData: pageData }),
    useGetMobileCampaignsQuery: () => ({ currentData: pageData }),
    useGetMobileInstallationsQuery: () => ({ currentData: pageData }),
  };
  const mobileApi = new Proxy({}, { get: (_, key) => {
    if (String(key).endsWith('Mutation')) return [() => { throw Error('unexpected mutation during rendering'); }, {}];
    return (args, options) => { if (!options?.skip) calls.push(String(key)); return { refetch() {}, ...(queries[key]?.() ?? {}), ...(failure && !options?.skip ? { error: { data: { message: 'Indisponible temporairement' } } } : {}) }; };
  } });
  function load(filename) {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename);
    const result = {};
    cache.set(filename, result);
    const req = name => {
      if (name.endsWith('.css')) return { default: new Proxy({}, { get: (_, key) => key }) };
      if (name.endsWith('/mobileOperationsApi')) return new Proxy(mobileApi, { get: (target, key) => String(key).endsWith('Mutation') ? () => target[key] : target[key] });
      if (name.endsWith('/storesApi')) return { useGetStoreStatusQuery: () => ({ data: status, refetch() {} }) };
      if (name.endsWith('/profileApi')) return { useGetCurrentUserProfileQuery: () => ({ data: { user: { id: 'test-admin', role: 'admin' } } }) };
      if (name === 'next/link') return { default: ({ children, ...props }) => React.createElement('a', props, children) };
      if (name.endsWith('/ui/Feedback')) return { confirmAction: async m => (globalThis.window?.confirm ?? globalThis.confirm)(typeof m === 'string' ? m : m.message), promptText: async m => globalThis.window?.prompt?.(typeof m === 'string' ? m : m.message) ?? null, notify: () => {} };
      if (name.startsWith('@/')) return load(path.resolve(root, name.slice(2)) + '.ts');
      if (name.startsWith('.')) {
        const base = path.resolve(path.dirname(filename), name);
        return load(fs.existsSync(base + '.tsx') ? base + '.tsx' : base + '.ts');
      }
      return require(name);
    };
    new Function('exports', 'require', ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText)(result, req);
    return result;
  }
  const Page = load(path.resolve(root, 'app/(admin)/mobile-operations/page.tsx')).default;
  return { calls, html: renderToStaticMarkup(React.createElement(Page)) };
}
test('old and disabled backends render an explanation without fetching mobile data', () => {
  for (const status of [{ enabled: true, permissions: ['mobile.analytics.read'] }, { permissions: ['mobile.analytics.read'], features: { mobileOperations: false } }]) {
    const result = workspace(status);
    assert.match(result.html, /Supervision non activée/); assert.deepEqual(result.calls, []);
  }
});
test('a reader without campaign permissions never mounts the campaign workspace', () => {
  const result = workspace({ permissions: ['mobile.installations.read'], features: { mobileOperations: true } });
  assert.match(result.html, /Installations connues/); assert.doesNotMatch(result.html, /Nouveau brouillon|Règles de mise à jour/);
  assert.deepEqual(result.calls, ['useGetMobileInstallationsQuery']);
});
test('campaign reader sees no create action and disabled sending is explained', () => {
  const result = workspace({ permissions: ['mobile.campaigns.read'], features: { mobileOperations: true, mobileCampaigns: false } });
  assert.match(result.html, /Campagnes mobiles/); assert.match(result.html, /L’envoi est désactivé/); assert.doesNotMatch(result.html, /Nouveau brouillon/);
  assert.deepEqual(result.calls, ['useGetMobileCampaignsQuery']);
});
test('policy UI renders as a separate permission-gated workspace', () => {
  const result = workspace({ permissions: ['mobile.policies.manage'], features: { mobileOperations: true } });
  assert.match(result.html, /Nouvelle règle/); assert.match(result.html, /aucune application dans les Stores/);
  assert.deepEqual(result.calls, ['useGetMobilePoliciesQuery']);
});
test('query failures are visible rather than presented as zero measurements', () => {
  const result = workspace({ permissions: ['mobile.analytics.read'], features: { mobileOperations: true } }, true);
  assert.match(result.html, /role="alert"/); assert.match(result.html, /Indisponible temporairement/);
  assert.doesNotMatch(result.html, /Source : Zwanga PostgreSQL/);
});
