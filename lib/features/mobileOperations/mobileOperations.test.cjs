const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
function load(file, customRequire = require) {
  const result = {};
  new Function(
    "exports",
    "require",
    ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  )(result, customRequire);
  return result;
}
const p = load("mobilePresentation.ts");
const campaign = {
  id: "campaign",
  createdBy: "author",
  approvedBy: null,
  state: "draft",
  expiresAt: "2030-01-01T00:00:00Z",
};
const all = ["read", "create", "approve", "launch"].map(
  (v) => "mobile.campaigns." + v,
);
test("reading campaigns never grants editing, approval, launch or cancellation", () => {
  assert.deepEqual(
    p.campaignActions(campaign, ["mobile.campaigns.read"], "reviewer", true, 0),
    { edit: false, approve: false, launch: false, cancel: false },
  );
});
test("author cannot self-approve even with every permission", () => {
  assert.equal(
    p.campaignActions(campaign, all, "author", true, 0).approve,
    false,
  );
  assert.equal(
    p.campaignActions(campaign, all, undefined, true, 0).approve,
    false,
  );
  assert.equal(
    p.campaignActions(campaign, all, "reviewer", true, 0).approve,
    true,
  );
});
test("sending requires approval, feature flag, permission and an unexpired campaign", () => {
  const approved = { ...campaign, state: "approved", approvedBy: "reviewer" };
  assert.equal(
    p.campaignActions(campaign, all, "admin", true, 0).launch,
    false,
  );
  assert.equal(p.campaignActions(approved, all, "admin", true, 0).launch, true);
  assert.equal(
    p.campaignActions(approved, all, "admin", false, 0).launch,
    false,
  );
  assert.equal(
    p.campaignActions(
      approved,
      all,
      "admin",
      true,
      Date.parse(approved.expiresAt),
    ).launch,
    false,
  );
  assert.equal(
    p.campaignActions({ ...approved, approvedBy: null }, all, "admin", true, 0)
      .launch,
    false,
  );
});
test("launched campaigns cannot be edited or launched again", () => {
  for (const state of ["scheduled", "running", "completed", "cancelled"]) {
    const actions = p.campaignActions(
      { ...campaign, state, approvedBy: "reviewer" },
      all,
      "admin",
      true,
      0,
    );
    assert.equal(actions.edit, false);
    assert.equal(actions.approve, false);
    assert.equal(actions.launch, false);
  }
});
test("unavailable measurements remain different from zero", () => {
  assert.equal(p.numberLabel(null), "Indisponible");
  assert.equal(p.numberLabel(undefined), "Indisponible");
  assert.equal(p.numberLabel(NaN), "Indisponible");
  assert.equal(p.numberLabel(0), "0");
  assert.equal(p.dateLabel("invalid"), "—");
});
test("request intent preserves IDs on retries and separates changed payloads", () => {
  let sequence = 0;
  const intent = p.createRequestIntent(() => String(++sequence));
  assert.equal(intent.id("payload"), "1");
  assert.equal(intent.id("payload"), "1");
  assert.equal(intent.id("changed"), "2");
  assert.equal(intent.id("payload"), "1");
  intent.complete("payload");
  assert.equal(intent.id("payload"), "3");
});
test("local datetime is converted to UTC without silently accepting an empty date", () => {
  const iso = "2026-11-05T12:30:00.000Z";
  assert.equal(p.isoDateTime(p.localDateTime(iso)), iso);
  assert.throws(() => p.isoDateTime(""));
  assert.throws(() => p.isoDateTime("bad"));
});
test("every mobile tab uses an explicit permission from the backend contract", () => {
  // Keep the admin test suite runnable from its own checkout (no sibling repo required).
  const contract = new Set(['mobile.analytics.read', 'mobile.installations.read', 'store.versions.read', 'mobile.policies.manage', 'mobile.campaigns.read', 'store.alerts.read', 'mobile.audit.read']);
  for (const [, , permission] of p.mobileTabs) assert.ok(contract.has(permission), permission);
});
test("mobile routes share the authenticated API and exact DTOs for sensitive actions", () => {
  let endpoints;
  load("mobileOperationsApi.ts", (name) => {
    assert.equal(name, "../api/baseApi");
    return {
      baseApi: {
        enhanceEndpoints: ({ addTagTypes }) => {
          assert.deepEqual(addTagTypes, ["MobileOperations"]);
          return {
            injectEndpoints: (options) => {
              endpoints = options.endpoints({
                query: (x) => x,
                mutation: (x) => x,
              });
              return {};
            },
          };
        },
      },
    };
  });
  const input = { id: "stable-id", title: "Test", revision: undefined };
  assert.deepEqual(endpoints.saveMobileCampaign.query(input), {
    url: "/admin/mobile-operations/campaigns",
    method: "POST",
    body: input,
  });
  assert.equal(
    endpoints.saveMobileCampaign.query({ ...input, revision: 3 }).method,
    "PUT",
  );
  assert.equal(
    endpoints.saveMobilePolicy.query({ id: "x/y", revision: 2 }).url,
    "/admin/mobile-operations/policies/x%2Fy",
  );
  assert.deepEqual(
    endpoints.actOnMobileCampaign.query({
      id: "id",
      action: "launch",
      revision: 4,
      confirmed: true,
    }),
    {
      url: "/admin/mobile-operations/campaigns/id/launch",
      method: "POST",
      body: { revision: 4, confirmed: true },
    },
  );
  assert.deepEqual(
    endpoints.toggleMobilePolicy.query({
      id: "id",
      active: false,
      revision: 7,
      confirmed: true,
    }),
    {
      url: "/admin/mobile-operations/policies/id/deactivate",
      method: "POST",
      body: { revision: 7, confirmed: true },
    },
  );
  assert.deepEqual(
    endpoints.getMobileInstallations.query({ page: 2, limit: 25 }),
    {
      url: "/admin/mobile-operations/installations",
      params: { page: 2, limit: 25 },
    },
  );
});
test("navigation preserves existing groups and hides ungranted workspaces", () => {
  const nav = load("../../../app/components/admin/navigation.ts", (name) => {
    assert.equal(name, "lucide-react");
    return {};
  });
  assert.equal(nav.withStoreNavigation(nav.navGroups, []), nav.navGroups);
  const base = JSON.stringify(nav.navGroups);
  const expanded = nav.withStoreNavigation(nav.navGroups, [
    "store.reviews.read",
    "mobile.analytics.read",
  ]);
  assert.equal(JSON.stringify(nav.navGroups), base);
  assert.ok(expanded.some((g) => g.items.some((i) => i.href === "/stores")));
  assert.ok(
    expanded.some((g) => g.items.some((i) => i.href === "/mobile-operations")),
  );
  assert.equal(
    nav
      .withStoreNavigation(nav.marketerGroups, ["mobile.campaigns.read"])
      .some((g) => g.items.some((i) => i.href === "/stores")),
    false,
  );
});
