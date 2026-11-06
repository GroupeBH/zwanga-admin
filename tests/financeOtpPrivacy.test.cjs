const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const filename = path.join(__dirname, '../lib/features/finance/financeOtpPrivacy.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = { exports: {} };
new Function('exports', 'module', compiled)(loaded.exports, loaded);
const { redactFinanceAction } = loaded.exports;
for (const endpointName of ['createDirectPayout', 'retryPayout']) {
  test(`redacts ${endpointName} DevTools args and transport without modifying the sent operation`, () => {
    const body = { otpCode: '123456', amount: 5000 };
    const action = { type: 'api/executeMutation/fulfilled', meta: {
      arg: { endpointName, originalArgs: endpointName === 'retryPayout' ? { id: 'withdrawal', body } : body },
      baseQueryMeta: { request: { body: '123456' } }, requestId: 'request',
    } };
    const safe = redactFinanceAction(action);
    assert.equal(JSON.stringify(safe).includes('123456'), false);
    assert.equal(safe.meta.requestId, 'request');
    assert.equal(Object.hasOwn(safe.meta, 'baseQueryMeta'), false);
    assert.equal(body.otpCode, '123456');
    assert.equal(JSON.stringify(safe).includes('5000'), true);
  });
}
test('does not change unrelated Redux actions', () => {
  const action = { type: 'ui/toggleSidebar' };
  assert.equal(redactFinanceAction(action), action);
});
