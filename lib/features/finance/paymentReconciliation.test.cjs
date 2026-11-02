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
const errors = load('../../utils/apiErrors.ts');
const policy = load('paymentReconciliation.ts', () => errors);
test('errors distinguish permission, network, missing order and provider configuration from missing route', () => {
  for (const [error, pattern] of [
    [{ status: 401 }, /Session expirée/], [{ status: 403 }, /super administrateur/],
    [{ status: 429 }, /Patientez/], [{ status: 'FETCH_ERROR' }, /Actualisez/],
    [{ status: 'TIMEOUT_ERROR' }, /Actualisez/],
    [{ status: 404 }, /introuvable ou route/],
    [{ status: 404, data: { message: 'Cannot POST /api/v1/admin/payments/id/reconcile' } }, /introuvable ou route/],
    [{ status: 404, data: { message: 'Transaction de paiement introuvable' } }, /^Transaction de paiement introuvable$/],
    [{ status: 502, data: { message: 'Vérification FlexPay indisponible' } }, /^Vérification FlexPay indisponible$/],
    [{ status: 400, data: { message: 'Service de versement non configuré' } }, /^Service de versement non configuré$/],
  ]) assert.match(policy.paymentReconciliationError(error), pattern);
});
test('HTTP success without completed settlement is not presented as a successful payment', () => {
  for (const result of [{}, { status: 'succeeded' }, { completed: false, status: 'pending' }, { completed: true, status: 'pending' }])
    assert.match(policy.paymentReconciliationMessage(result), /Résultat non confirmé/);
  for (const status of ['failed', 'cancelled'])
    assert.match(policy.paymentReconciliationMessage({ status, completed: true }), /échoué ou annulé/);
  assert.match(policy.paymentReconciliationMessage({ status: 'succeeded', completed: true }), /Paiement confirmé/);
});
let endpoints;
load('financeApi.ts', name => {
  if (name === '@/lib/utils/toList') return { listProvidesTags: () => [] };
  assert.equal(name, '../api/baseApi');
  return { baseApi: { injectEndpoints: ({ endpoints: build }) => {
    endpoints = build({ query: x => x, mutation: x => x }); return {};
  } } };
});
test('reconciliation uses the payment UUID route without amount, phone, retry or cancellation body', () => {
  assert.deepEqual(endpoints.reconcileAdminPayment.query('payment'), { url: '/admin/payments/payment/reconcile', method: 'POST' });
  assert.equal(endpoints.reconcileAdminPayment.query('bad/id').url, '/admin/payments/bad%2Fid/reconcile');
  const tags = endpoints.reconcileAdminPayment.invalidatesTags({}, undefined, 'payment');
  for (const tag of ['Wallets', 'Referrals', 'Users', 'Dashboard', 'Subscriptions', 'Bookings']) assert.ok(tags.includes(tag));
});

function harness(t, result, failure, options = {}) {
  const previous = globalThis.confirm; globalThis.confirm = () => true;
  t.after(() => { if (previous === undefined) delete globalThis.confirm; else globalThis.confirm = previous; });
  const slots = []; let cursor = 0;
  const state = { isLoading: false, reset() { delete this.error; delete this.originalArgs; } };
  const calls = [], cancelCalls = [];
  const cancelState = { reset() { delete this.error; } };
  const payment = { id: 'payment', reference: 'ref', status: 'pending', provider: 'flexpay', purpose: 'wallet_top_up', amount: 1000, currency: 'CDF', ...options.payment };
  const Component = load('../../../app/(admin)/payments/page.tsx', name => {
    if (name === 'react') return { ...React, useRef(initial) {
      const index = cursor++; if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    }, useState(initial) {
      const index = cursor++; if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    } };
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
    if (name.endsWith('.css')) return { default: new Proxy({}, { get: (_, key) => key }) };
    if (name.endsWith('/financeApi')) return {
      useGetAdminPaymentsQuery: () => ({ data: { payments: [payment, ...(options.otherPayment ? [options.otherPayment] : [])], total: 1, source: options.source ?? 'admin-api' } }),
      useReconcileAdminPaymentMutation: () => [id => ({ unwrap: async () => {
        calls.push(id); state.originalArgs = id;
        if (failure) { state.error = failure; throw failure; } return result;
      } }), state],
      useCancelEnqueuedPayoutMutation: () => [id => ({ unwrap: async () => {
        cancelCalls.push(id);
        if (!options.allowCancel) assert.fail('no cancellation');
        if (options.cancelFailure) { cancelState.error = options.cancelFailure; throw options.cancelFailure; }
        return options.cancelResult ?? { ...payment, status: 'cancelled' };
      } }), cancelState],
    };
    if (name.endsWith('/profileApi')) return { useGetCurrentUserProfileQuery: () => ({ data: { user: { role: options.role ?? 'super_admin' } } }) };
    if (name.endsWith('/adminRoles')) return { isSuperAdminRole: role => role === 'super_admin' };
    if (name.endsWith('/exportApi')) return { useExportAdminXlsMutation: () => [() => {}, {}] };
    if (name.endsWith('/format')) return new Proxy({}, { get: () => value => String(value ?? '') });
    if (name.endsWith('/apiErrors')) return errors;
    if (name.endsWith('/paymentReconciliation')) return policy;
    if (name.endsWith('/downloadBlob')) return {};
    if (name === './DriverPayoutReviews') return { DriverPayoutReviews: () => null };
    if (name === './PayoutRecoveryDrawer') return { PayoutRecoveryDrawer: () => null };
    if (name === './DirectPayoutDrawer') return { DirectPayoutDrawer: () => null };
    assert.fail('Unexpected module ' + name);
  }).default;
  const render = () => { cursor = 0; return Component(); };
  const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node)
    ? node.flatMap(all) : [node, ...all(node.props?.children)];
  const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object'
    ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
  const button = (tree, label) => all(tree).find(n => n.type === 'button' && text(n).includes(label));
  return { render, all, text, button, calls, cancelCalls };
}
test('treasury payment history distinguishes the initiating admin from the recipient', t => {
  const f = harness(t, {}, undefined, { payment: {
    purpose: 'admin_payout', phone: '+243810000000', description: 'Assistance de test',
  } });
  f.button(f.render(), 'Détails').props.onClick();
  const drawer = f.all(f.render()).find(n => n.type === 'aside');
  assert.match(f.text(drawer), /Super admin initiateur/);
  assert.match(f.text(drawer), /Numéro destinataire\+243810000000/);
  assert.match(f.text(drawer), /Motif du virementAssistance de test/);
  assert.doesNotMatch(f.text(drawer), /Suivi \/ relance du retrait/);
});

test('drawer stays open, shows unresolved result and never submits a second payment', async t => {
  const f = harness(t, { completed: false, status: 'pending', message: 'Statut non confirmé. Aucun nouvel envoi effectué.' });
  f.button(f.render(), 'Détails').props.onClick();
  await f.button(f.render(), 'Vérifier chez le prestataire').props.onClick();
  const tree = f.render();
  assert.ok(f.all(tree).some(n => n.type === 'aside'));
  assert.match(f.text(tree), /Statut non confirmé/); assert.deepEqual(f.calls, ['payment']);
});
test('drawer refreshes canonical success and disables rechecking a completed payment', async t => {
  const f = harness(t, { completed: true, status: 'succeeded' });
  f.button(f.render(), 'Détails').props.onClick();
  await f.button(f.render(), 'Vérifier chez le prestataire').props.onClick();
  assert.match(f.text(f.render()), /Paiement confirmé/);
  assert.equal(f.button(f.render(), 'Vérifier chez le prestataire').props.disabled, true);
});
test('drawer exposes actual provider failure rather than blaming route deployment', async t => {
  const f = harness(t, undefined, { status: 502, data: { message: 'Vérification FlexPay indisponible' } });
  f.button(f.render(), 'Détails').props.onClick();
  await f.button(f.render(), 'Vérifier chez le prestataire').props.onClick();
  assert.match(f.text(f.render()), /Vérification FlexPay indisponible/);
  assert.doesNotMatch(f.text(f.render()), /Vérifiez que la route admin est déployée/);
});

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
test('same-frame double click checks once and a finished check can be repeated explicitly', async t => {
  const pending = deferred(), f = harness(t, pending.promise);
  f.button(f.render(), 'Détails').props.onClick();
  const action = f.button(f.render(), 'Vérifier chez le prestataire').props.onClick;
  const first = action(), duplicate = action();
  assert.deepEqual(f.calls, ['payment']);
  pending.resolve({ completed: false, status: 'pending' });
  await Promise.all([first, duplicate]);
  await f.button(f.render(), 'Vérifier chez le prestataire').props.onClick();
  assert.deepEqual(f.calls, ['payment', 'payment']);
});
test('an in-flight check cannot close its drawer or overwrite another transaction', async t => {
  const pending = deferred(), other = { id: 'other', reference: 'other-reference', status: 'pending', amount: 2000 };
  const f = harness(t, pending.promise, undefined, { otherPayment: other });
  f.button(f.render(), 'Détails').props.onClick();
  const action = f.button(f.render(), 'Vérifier chez le prestataire').props.onClick();
  let tree = f.render();
  f.all(tree).find(n => n.props?.['aria-label'] === 'Fermer').props.onClick();
  f.all(tree).find(n => n.props?.role === 'presentation').props.onMouseDown();
  f.all(tree).filter(n => n.type === 'button' && f.text(n) === 'Détails')[1].props.onClick();
  const drawer = f.all(f.render()).find(n => n.type === 'aside');
  assert.ok(drawer); assert.doesNotMatch(f.text(drawer), /other-reference/);
  pending.resolve({ completed: false, status: 'pending' }); await action;
  tree = f.render();
  f.all(tree).find(n => n.props?.['aria-label'] === 'Fermer').props.onClick();
  assert.equal(f.all(f.render()).some(n => n.type === 'aside'), false);
  f.all(f.render()).filter(n => n.type === 'button' && f.text(n) === 'Détails')[1].props.onClick();
  assert.match(f.text(f.all(f.render()).find(n => n.type === 'aside')), /other-reference/);
  assert.doesNotMatch(f.text(f.render()), /Résultat non confirmé/);
});
test('network failure releases the action lock without automatic replay', async t => {
  const f = harness(t, undefined, { status: 'TIMEOUT_ERROR' });
  f.button(f.render(), 'Détails').props.onClick();
  await f.button(f.render(), 'Vérifier chez le prestataire').props.onClick();
  assert.deepEqual(f.calls, ['payment']);
  assert.match(f.text(f.render()), /Actualisez le statut/);
  await f.button(f.render(), 'Vérifier chez le prestataire').props.onClick();
  assert.deepEqual(f.calls, ['payment', 'payment']);
});
test('cancellation and verification share a synchronous lock and target only the selected UUID', async t => {
  const pending = deferred();
  const payment = { provider: 'pawapay', purpose: 'driver_payout', orderNumber: 'original-order' };
  const f = harness(t, {}, undefined, { payment, allowCancel: true, cancelResult: pending.promise });
  f.button(f.render(), 'Détails').props.onClick();
  const tree = f.render();
  const cancel = f.button(tree, 'Annuler le versement de gains').props.onClick;
  const running = cancel();
  await cancel();
  await f.button(tree, 'Vérifier chez le prestataire').props.onClick();
  assert.deepEqual(f.cancelCalls, ['payment']); assert.deepEqual(f.calls, []);
  pending.resolve({ id: 'payment', ...payment, status: 'cancelled' }); await running;
  assert.match(f.text(f.render()), /Le versement a été annulé/);
});
test('a pending verification also blocks cancellation until its completion', async t => {
  const pending = deferred();
  const f = harness(t, pending.promise, undefined, { payment: { provider: 'pawapay', purpose: 'referral_payout', orderNumber: 'original-order' } });
  f.button(f.render(), 'Détails').props.onClick();
  const tree = f.render();
  const running = f.button(tree, 'Vérifier chez le prestataire').props.onClick();
  await f.button(tree, 'Annuler le retrait en attente').props.onClick();
  assert.deepEqual(f.calls, ['payment']); assert.deepEqual(f.cancelCalls, []);
  pending.resolve({ completed: false, status: 'pending' }); await running;
});
test('read-only roles, compatibility lists and settled payments do not call the admin mutation', async t => {
  for (const options of [{ role: 'admin' }, { role: 'driver' }, { source: 'user-details-fallback' }, { payment: { status: 'succeeded' } }]) {
    const f = harness(t, {}, undefined, options);
    f.button(f.render(), 'Détails').props.onClick();
    const button = f.button(f.render(), 'Vérifier chez le prestataire');
    assert.equal(button.props.disabled, true);
    await button.props.onClick(); assert.deepEqual(f.calls, []);
  }
});
