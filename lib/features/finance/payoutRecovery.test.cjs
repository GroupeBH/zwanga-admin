const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function load(file, customRequire = require) {
  const exports = {};
  new Function("exports", "require", ts.transpileModule(
    fs.readFileSync(path.resolve(__dirname, file), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    },
  ).outputText)(exports, customRequire);
  return exports;
}
const roles = load("../auth/adminRoles.ts");
const policy = load("payoutRecovery.ts", (name) => {
  assert.equal(name, "../auth/adminRoles");
  return roles;
});
const eligible = {
  id: "withdrawal", userId: "user", status: "pending", amount: 10000, currency: "CDF", phone: "test",
  createdAt: "2026-10-20T12:00:00Z", requestedAt: null, processedAt: null, failureReason: null,
  paymentTransactionId: null, expectedReference: "withdrawal", canResolveNotPaid: true,
  resolutionRequiresProviderConfirmation: true,
};
const reason = "Non-exécution définitive confirmée";
const evidenceReference = "CONFIRMATION-TEST-123";

test("referrals require super admin; driver recovery accepts admin and super admin", () => {
  for (const role of [undefined, null, "", "marketer", "passenger", "driver"]) {
    assert.equal(policy.canManagePayout("referral", role), false);
    assert.equal(policy.canManagePayout("driver", role), false);
  }
  assert.equal(policy.canManagePayout("referral", "admin"), false);
  assert.equal(policy.canManagePayout("referral", "super_admin"), true);
  assert.equal(policy.canManagePayout("driver", "admin"), true);
  assert.equal(policy.canManagePayout("driver", "super_admin"), true);
});

test("unsent reservations remain recoverable without a payment ID", () => {
  assert.equal(policy.canReleasePayout(eligible), true);
  assert.equal(policy.resolutionError(eligible, reason, evidenceReference, true), null);
});

test("old APIs, completed transfers, orphan payments and other providers fail closed", () => {
  for (const change of [
    { canResolveNotPaid: undefined }, { canResolveNotPaid: false },
    { canResolveNotPaid: "true" }, { resolutionRequiresProviderConfirmation: undefined },
    { expectedReference: null }, { expectedReference: "   " }, { expectedReference: "x".repeat(121) },
    { status: "succeeded" }, { status: "cancelled" }, { status: "failed" },
    { recoveryBlocked: true }, { paymentTransactionId: "missing" },
    { paymentTransaction: { provider: "pawapay", status: "pending" } },
    { paymentTransaction: { provider: "flexpay", status: "succeeded" } },
    { paymentTransactionId: "a", paymentTransaction: { id: "b", provider: "flexpay", status: "pending" } },
  ]) assert.equal(policy.canReleasePayout({ ...eligible, ...change }), false, JSON.stringify(change));
});

test("exact DTO evidence lengths and explicit boolean confirmation are enforced", () => {
  for (const confirmation of [false, undefined, null, "true", 1])
    assert.ok(policy.resolutionError(eligible, reason, evidenceReference, confirmation));
  assert.equal(policy.payoutEvidenceError("x".repeat(500), "x".repeat(200)), null);
  for (const [r, e] of [["    a", evidenceReference], ["x".repeat(501), evidenceReference], [reason, "  "], [reason, "x".repeat(201)]])
    assert.ok(policy.payoutEvidenceError(r, e));
});

let endpoints;
load("payoutRecoveryApi.ts", (name) => {
  if (name === "./payoutRecovery") return policy;
  assert.equal(name, "../api/baseApi");
  return { baseApi: { injectEndpoints: ({ endpoints: build }) => {
    endpoints = build({ query: (x) => x, mutation: (x) => x });
    return {};
  } } };
});

test("recovery uses authenticated admin routes, correct IDs and exact resolution payloads", () => {
  for (const kind of ["referral", "driver"]) {
    const target = { kind, id: "withdrawal" };
    const prefix = kind === "driver" ? "/admin/driver-payouts" : "/admin/referrals/withdrawals";
    const body = { expectedReference: "withdrawal", reason, evidenceReference, confirmedNotPaid: true };
    assert.equal(endpoints.getPayoutRecoveryDetail.query(target), `${prefix}/withdrawal`);
    assert.deepEqual(endpoints.resolvePayoutNotPaid.query({ ...target, body }), {
      url: `${prefix}/withdrawal/resolve-not-paid`, method: "POST", body,
    });
    assert.deepEqual(endpoints.reconcilePayoutRecovery.query(target), {
      url: `${prefix}/withdrawal/reconcile`, method: "POST", body: {},
    });
  }
  assert.equal(policy.payoutPath({ kind: "driver", id: "bad/path" }), "/admin/driver-payouts/bad%2Fpath");
});

test("optional recovered provider order applies only to driver reconciliation", () => {
  assert.deepEqual(endpoints.reconcilePayoutRecovery.query({ kind: "driver", id: "d", orderNumber: " ORDER " }).body, { orderNumber: "ORDER" });
  assert.deepEqual(endpoints.reconcilePayoutRecovery.query({ kind: "referral", id: "r", orderNumber: "ORDER" }).body, {});
  assert.deepEqual(endpoints.getDriverPayoutReviews.query({ limit: 25, offset: 25 }), {
    url: "/admin/driver-payouts", params: { limit: 25, offset: 25 },
  });
});

test("late success closure does not use the release endpoint", () => {
  const body = { reason, evidenceReference };
  assert.deepEqual(endpoints.closeDriverPayoutIncident.query({ id: "d", body }), {
    url: "/admin/driver-payouts/d/close-late-success", method: "POST", body,
  });
});

test("detail normalization retains audit and late success; mutations refresh all financial views", () => {
  const raw = { ...eligible, resolution: { reason, evidenceReference }, lateSuccessAfterRelease: true };
  const normalized = endpoints.getPayoutRecoveryDetail.transformResponse(raw, undefined, { kind: "referral" });
  assert.equal(normalized.payout, raw);
  assert.equal(normalized.resolution, raw.resolution);
  assert.equal(normalized.lateSuccessAfterRelease, true);
  const driver = { payout: eligible, events: [] };
  assert.equal(endpoints.getPayoutRecoveryDetail.transformResponse(driver, undefined, { kind: "driver" }), driver);
  assert.equal(endpoints.getPayoutRecoveryDetail.keepUnusedDataFor, 0);
  for (const key of ["resolvePayoutNotPaid", "reconcilePayoutRecovery", "closeDriverPayoutIncident"])
    for (const tag of ["Payments", "Referrals", "Wallets", "Users", "Dashboard"])
      assert.ok(endpoints[key].invalidatesTags.includes(tag));
});

function loadDrawer(role, apiHooks, react = React) {
  const { PayoutRecoveryDrawer } = load("../../../app/(admin)/payments/PayoutRecoveryDrawer.tsx", (name) => {
    if (name === "react") return react;
    if (name.endsWith("/profileApi")) return { useGetCurrentUserProfileQuery: () => ({ data: { user: { role } } }) };
    if (name.endsWith("/payoutRecoveryApi")) return apiHooks;
    if (name.endsWith("/payoutRecovery")) return policy;
    if (name.endsWith("/format")) return load("format.ts");
    if (name.endsWith("/apiErrors")) return load("../../utils/apiErrors.ts");
    if (name.endsWith(".css")) return { default: new Proxy({}, { get: (_, key) => String(key) }) };
    return require(name);
  });
  return PayoutRecoveryDrawer;
}

function renderDrawer({ kind = "referral", role = "super_admin", payout = eligible, error, extra = {}, onOpen } = {}) {
  const apiHooks = {
    useGetPayoutRecoveryDetailQuery: () => ({ currentData: { payout, ...extra }, error, isFetching: false }),
    useReconcilePayoutRecoveryMutation: () => [() => { throw new Error("No mutation on render"); }],
    useResolvePayoutNotPaidMutation: () => [() => { throw new Error("No mutation on render"); }],
    useCloseDriverPayoutIncidentMutation: () => [() => { throw new Error("No mutation on render"); }],
    useRetryPayoutMutation: () => [() => { throw new Error("No mutation on render"); }],
  };
  const PayoutRecoveryDrawer = loadDrawer(role, apiHooks);
  return renderToStaticMarkup(React.createElement(PayoutRecoveryDrawer, { target: { kind, id: payout.id }, onClose() {}, onOpen }));
}

test("UI shows evidence and unchecked attestation, disables release before consent", () => {
  const html = renderDrawer();
  assert.match(html, /Référence de la preuve/);
  assert.match(html, /type="checkbox"/);
  assert.doesNotMatch(html, /checked=""/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Confirmer la libération/);
  assert.match(html, /Statut du retrait Zwanga/);
  assert.match(html, /Statut transaction prestataire/);
});

test("UI exposes referral actions only to super admin, but driver actions to admin", () => {
  assert.doesNotMatch(renderDrawer({ role: "admin" }), /Confirmer la libération/);
  assert.match(renderDrawer({ role: "admin" }), /Lecture seule/);
  assert.match(renderDrawer({ role: "admin", kind: "driver" }), /Confirmer la libération/);
});

test("UI disables actions when detail cannot refresh and handles missing backend route", () => {
  const html = renderDrawer({ error: { status: 404 } });
  assert.match(html, /route de résolution absente/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Confirmer la libération/);
});

test("UI offers no release for legacy backend and provides late-success reconciliation", () => {
  assert.doesNotMatch(renderDrawer({ payout: { ...eligible, canResolveNotPaid: undefined } }), /Confirmer la libération/);
  const html = renderDrawer({ kind: "driver", payout: { ...eligible, status: "succeeded", recoveryBlocked: true }, extra: { events: [] } });
  assert.doesNotMatch(html, /Confirmer la libération/);
  assert.match(html, /Clôturer l&#x27;incident/);
  assert.match(html, /aucun remboursement/);
});

test("UI displays stored proof and escapes provider content rather than rendering HTML", () => {
  const html = renderDrawer({ extra: { resolution: {
    actorId: "admin", expectedReference: "withdrawal", createdAt: eligible.createdAt,
    reason: "<script>alert(1)</script>", evidenceReference,
  } } });
  assert.match(html, /Preuve de résolution enregistrée/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

// Component-handler tests with deterministic hooks and mocked HTTP. No browser,
// provider or real withdrawal is used. SSR tests above exercise actual React rendering.
function handlerHarness(t, { initial = eligible, fresh = { payout: eligible }, refreshFailureAfterWrite = false, writeFailure, role = "super_admin", kind = "referral", onOpen } = {}) {
  const priorWindow = globalThis.window;
  globalThis.window = { confirm: () => true };
  t.after(() => { if (priorWindow === undefined) delete globalThis.window; else globalThis.window = priorWindow; });
  const slots = [];
  let cursor = 0;
  const calls = [];
  let wrote = false;
  let holdRefresh;
  let firstRefresh = true;
  const query = {
    currentData: { payout: initial }, isFetching: false,
    refetch: () => ({ unwrap: async () => {
      calls.push("read");
      if (holdRefresh && firstRefresh) { firstRefresh = false; await holdRefresh; }
      if (refreshFailureAfterWrite && wrote) {
        query.error = { status: "FETCH_ERROR" };
        throw query.error;
      }
      query.currentData = fresh;
      return fresh;
    } }),
  };
  const mutation = (name) => (arg) => ({ unwrap: async () => {
    wrote = true; calls.push({ name, arg });
    if (writeFailure) throw writeFailure;
    return fresh.payout;
  } });
  const Component = loadDrawer(role, {
    useGetPayoutRecoveryDetailQuery: () => query,
    useReconcilePayoutRecoveryMutation: () => [mutation("reconcile")],
    useResolvePayoutNotPaidMutation: () => [mutation("release")],
    useCloseDriverPayoutIncidentMutation: () => [mutation("close")],
    useRetryPayoutMutation: () => [mutation("retry")],
  }, {
    useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next) => { slots[index] = typeof next === "function" ? next(slots[index]) : next; }];
    },
    useRef: (initial) => { const index = cursor++; return slots[index] ??= { current: initial }; },
    useEffect: () => {},
  });
  function flatten(element) {
    if (!element || typeof element !== "object") return [];
    if (Array.isArray(element)) return element.flatMap(flatten);
    return [element, ...flatten(element.props?.children)];
  }
  return {
    calls, query,
    hold: () => { let resume; holdRefresh = new Promise((resolve) => { resume = resolve; }); return () => resume(); },
    render: () => {
      cursor = 0;
      return flatten(Component({ target: { kind, id: eligible.id }, onClose() {}, onOpen }));
    },
    messages: () => slots.filter((x) => typeof x === "string"),
  };
}

const verifyButton = (tree) => tree.find((e) => e.type === "button" && JSON.stringify(e.props.children).includes("Vérifier sans"));
const settle = () => new Promise((resolve) => setImmediate(resolve));
function fillEvidence(harness) {
  harness.render().find((e) => e.type === "textarea").props.onChange({ target: { value: reason } });
  harness.render().find((e) => e.type === "input" && e.props.maxLength === 200).props.onChange({ target: { value: evidenceReference } });
  harness.render().find((e) => e.type === "input" && e.props.type === "checkbox").props.onChange({ target: { checked: true } });
}

test("double click submits exactly once and reads the canonical dossier before mutation", async (t) => {
  const h = handlerHarness(t);
  const resume = h.hold();
  const click = verifyButton(h.render()).props.onClick;
  const first = click();
  await click();
  assert.deepEqual(h.calls, ["read"]);
  resume(); await first;
  assert.deepEqual(h.calls, ["read", { name: "reconcile", arg: { kind: "referral", id: eligible.id, orderNumber: "" } }, "read"]);
});

test("fresh terminal status or changed reference prevents release from stale list/detail", async (t) => {
  for (const change of [{ status: "succeeded" }, { expectedReference: "changed" }]) {
    const h = handlerHarness(t, { fresh: { payout: { ...eligible, ...change } } });
    fillEvidence(h);
    h.render().find((e) => e.type === "form").props.onSubmit({ preventDefault() {} });
    await settle();
    assert.equal(h.calls.some((x) => typeof x === "object"), false);
    assert.ok(h.messages().some((x) => /état actuel|référence.*changé/.test(x)));
  }
});

test("release sends exact reference and evidence only after reread and consent", async (t) => {
  const h = handlerHarness(t);
  fillEvidence(h);
  h.render().find((e) => e.type === "form").props.onSubmit({ preventDefault() {} });
  await settle();
  assert.deepEqual(h.calls, ["read", { name: "release", arg: {
    kind: "referral", id: eligible.id,
    body: { expectedReference: eligible.expectedReference, reason, evidenceReference, confirmedNotPaid: true },
  } }, "read"]);
  assert.equal(h.render().find((e) => e.type === "input" && e.props.type === "checkbox").props.checked, false);
});

test("accepted mutation followed by refresh failure preserves success notice and blocks writes", async (t) => {
  const h = handlerHarness(t, { refreshFailureAfterWrite: true });
  await verifyButton(h.render()).props.onClick();
  assert.ok(h.messages().some((x) => x.startsWith("Vérification enregistrée")));
  assert.equal(verifyButton(h.render()).props.disabled, true);
  assert.equal(h.calls.filter((x) => typeof x === "object").length, 1);
});

test("ambiguous write failure refreshes without automatic second submission", async (t) => {
  const h = handlerHarness(t, { writeFailure: { status: "FETCH_ERROR" } });
  await verifyButton(h.render()).props.onClick();
  assert.ok(h.messages().some((x) => x.includes("Résultat non confirmé")));
  assert.equal(h.calls.filter((x) => typeof x === "object").length, 1);
  assert.equal(h.calls.at(-1), "read");
});

test("retry is super-admin only, fail-closed on old servers and disabled after replacement", () => {
  const payout = { ...eligible, canAdminRetry: true };
  assert.equal(policy.canRetryPayout(payout, "super_admin"), true);
  for (const role of [undefined, "admin", "marketer", "driver"]) assert.equal(policy.canRetryPayout(payout, role), false);
  for (const changed of [{ canAdminRetry: undefined }, { status: "succeeded" }, { retry: { replacementId: "next" } }, { recoveryBlocked: true }])
    assert.equal(policy.canRetryPayout({ ...payout, ...changed }, "super_admin"), false);
  assert.match(renderDrawer({ payout }), /Débloquer et relancer au même numéro/);
  assert.doesNotMatch(renderDrawer({ kind: "driver", role: "admin", payout }), /relancer au même numéro/i);
});

test("retry requires both confirmations and sends only evidence, never amount or phone", async t => {
  const initial = { ...eligible, canAdminRetry: true };
  const h = handlerHarness(t, { initial, fresh: { payout: initial } });
  fillEvidence(h);
  const button = () => h.render().find(e => e.type === "button" && /relancer au même/i.test(JSON.stringify(e.props.children)));
  assert.equal(button().props.disabled, true);
  h.render().filter(e => e.type === "input" && e.props.type === "checkbox")[1].props.onChange({ target: { checked: true } });
  assert.equal(button().props.disabled, false);
  await button().props.onClick();
  assert.deepEqual(h.calls, ["read", { name: "retry", arg: { kind: "referral", id: eligible.id, body: {
    reason, evidenceReference, expectedReference: eligible.expectedReference, confirmedNotPaid: true, confirmedNotReceived: true,
  } } }, "read"]);
});

test("retry remains visible but disabled, with reason and server deadline, on both withdrawal kinds", () => {
  for (const kind of ["driver", "referral"]) {
    const html = renderDrawer({ kind, payout: { ...eligible, canAdminRetry: false, canResolveNotPaid: false,
      adminRetry: { code: "SAFETY_DELAY", message: "Délai de sécurité de 15 minutes", availableAt: "2026-11-02T12:15:00Z" },
    } });
    assert.match(html, /<button[^>]*disabled=""[^>]*>Débloquer et relancer au même numéro/);
    assert.match(html, /Délai de sécurité de 15 minutes/);
    assert.match(html, /Disponible au plus tôt/);
    assert.match(renderDrawer({ kind }), /Mettez à jour le backend/);
  }
});

test("a replacement is followed through its own dossier, never by resending the source", async t => {
  const initial = { ...eligible, canAdminRetry: false, retry: { replacementId: "next", evidenceReference: "TEST-PROOF" } };
  const opened = [];
  const h = handlerHarness(t, { initial, onOpen: target => opened.push(target) });
  const button = h.render().find(e => e.type === "button" && e.props.children === "Suivre le versement de remplacement");
  button.props.onClick();
  assert.deepEqual(opened, [{ kind: "referral", id: "next" }]);
  assert.deepEqual(h.calls, []);
  assert.match(renderDrawer({ payout: initial, onOpen() {} }), /Une relance existe déjà/);
});

test("driver filter explicitly requests all pending or resolved payouts with bounded pages", () => {
  for (const view of ["pending", "resolved", "review"])
    assert.deepEqual(endpoints.getDriverPayoutReviews.query({ limit: 25, offset: 0, view }), {
      url: "/admin/driver-payouts", params: { limit: 25, offset: 0, view },
    });
});

const retryButton = h => h.render().find(e => e.type === "button" && /relancer au même/i.test(JSON.stringify(e.props.children)));
function confirmRetry(h) {
  fillEvidence(h);
  h.render().filter(e => e.type === "input" && e.props.type === "checkbox")[1].props.onChange({ target: { checked: true } });
}

test("concurrent retry clicks submit once for driver earnings and referral tokens", async t => {
  for (const kind of ["driver", "referral"]) {
    const initial = { ...eligible, canAdminRetry: true };
    const h = handlerHarness(t, { kind, initial, fresh: { payout: initial } });
    confirmRetry(h);
    const resume = h.hold();
    const click = retryButton(h).props.onClick;
    const first = click(); await click();
    assert.deepEqual(h.calls, ["read"]);
    resume(); await first;
    const writes = h.calls.filter(x => typeof x === "object");
    assert.equal(writes.length, 1);
    assert.equal(writes[0].arg.kind, kind);
    assert.equal(writes[0].name, "retry");
  }
});

test("late payment success or a new replacement from the canonical read prevents retry", async t => {
  for (const patch of [{ status: "succeeded" }, { canAdminRetry: false }, { retry: { replacementId: "next" } }, { expectedReference: "changed" }, { amount: 30000 }, { phone: 'changed' }, { currency: 'USD' }]) {
    const initial = { ...eligible, canAdminRetry: true };
    const h = handlerHarness(t, { initial, fresh: { payout: { ...initial, ...patch } } });
    confirmRetry(h); await retryButton(h).props.onClick();
    assert.equal(h.calls.filter(x => typeof x === "object").length, 0);
    assert.ok(h.messages().some(x => x.includes("Le dossier a changé")));
  }
});

test('retry result distinguishes confirmed, pending and failed transfers', () => {
  assert.match(policy.payoutRetryResultMessage({ ...eligible, status: 'pending' }), /pas encore confirmée/);
  assert.match(policy.payoutRetryResultMessage({ ...eligible, status: 'succeeded' }), /confirmé par le prestataire/);
  for (const status of ['failed', 'cancelled']) assert.match(policy.payoutRetryResultMessage({ ...eligible, status }), /échoué ou.*annulé/);
});

test('accepted retry is remembered even if canonical refresh fails and cannot be sent again', async t => {
  const initial = { ...eligible, canAdminRetry: true };
  const opened = [];
  const h = handlerHarness(t, { initial, fresh: { payout: initial }, refreshFailureAfterWrite: true, onOpen: target => opened.push(target) });
  confirmRetry(h); await retryButton(h).props.onClick();
  assert.equal(retryButton(h).props.disabled, true);
  const follow = h.render().find(e => e.type === 'button' && e.props.children === 'Suivre le versement de remplacement');
  assert.equal(follow.props.disabled, false); follow.props.onClick();
  assert.equal(opened.length, 1); assert.equal(h.calls.filter(x => typeof x === 'object').length, 1);
});
