const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Deterministic hook/HTTP harness: no SMS, browser storage or provider calls.
function harness(send = async () => ({ maskedPhone: '***123' })) {
  const slots = [], effects = [], calls = [];
  let cursor = 0, code = '';
  let intent = { action: 'direct_payout', payload: { amount: 10000, phone: '+243891234567' } };
  const onCode = value => { code = value; };
  const file = path.join(__dirname, '../app/(admin)/payments/FinanceOtpConfirmation.tsx');
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = {};
  new Function('exports', 'require', compiled)(loaded, name => {
    if (name === 'react') return {
      useState(initial) {
        const i = cursor++;
        if (!(i in slots)) slots[i] = initial;
        return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
      },
      useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
      useEffect(effect, deps) {
        const i = cursor++, previous = slots[i];
        if (!previous || deps.some((value, index) => !Object.is(value, previous[index]))) effects.push(effect);
        slots[i] = deps;
      },
    };
    if (name.endsWith('/financeOtpApi')) return {
      useSendFinanceOtpMutation: () => [body => ({ unwrap: async () => { calls.push(body); return send(body); } }), { isLoading: false }],
    };
    if (name.endsWith('/apiErrors')) return { getApiErrorMessage: (_error, fallback) => fallback };
    if (name.endsWith('.css')) return { default: new Proxy({}, { get: (_, key) => key }) };
    return require(name);
  });
  const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
  const render = () => {
    cursor = 0;
    const tree = flatten(loaded.FinanceOtpConfirmation({ intent, code, onCode, disabled: false }));
    for (const effect of effects.splice(0)) effect();
    return tree;
  };
  render();
  return {
    calls, render,
    intent: next => { intent = next; render(); },
    code: () => code,
    input: value => render().find(e => e.type === 'input').props.onChange({ target: { value } }),
    send: () => render().find(e => e.type === 'button').props.onClick(),
  };
}

test('OTP input is six numeric digits and is retained on identical rerenders', () => {
  const h = harness(); h.input('a12-345678');
  assert.equal(h.code(), '123456');
  h.render(); assert.equal(h.code(), '123456');
  h.intent({ action: 'direct_payout', payload: { amount: 10000, phone: '+243891234567' } });
  assert.equal(h.code(), '123456');
});

test('changing the financial intent clears the code and the prior SMS notice', async () => {
  const h = harness(); await h.send(); h.input('123456');
  assert.ok(h.render().some(e => e.props.role === 'status'));
  h.intent({ action: 'direct_payout', payload: { amount: 20000, phone: '+243891234567' } });
  assert.equal(h.code(), '');
  assert.equal(h.render().some(e => e.props.role === 'status'), false);
});

test('double clicks send one SMS and late results cannot confirm a changed withdrawal', async () => {
  let finish;
  const h = harness(() => new Promise(resolve => { finish = resolve; }));
  const pending = h.send(); await h.send();
  assert.equal(h.calls.length, 1);
  h.intent({ action: 'driver_payout_retry', targetId: 'other-withdrawal', payload: {} });
  finish({ maskedPhone: '***123' }); await pending;
  assert.equal(h.render().some(e => e.props.role === 'status'), false);
  assert.equal(h.code(), '');
});

test('SMS failure shows a safe error and never submits a financial transaction', async () => {
  const h = harness(async () => { throw new Error('private provider response'); });
  h.input('123456'); await h.send();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].action, 'direct_payout');
  assert.equal(h.code(), '');
  const error = h.render().find(e => e.props.role === 'alert');
  assert.match(error.props.children, /Aucun argent envoyé/);
  assert.doesNotMatch(error.props.children, /private provider/);
});
