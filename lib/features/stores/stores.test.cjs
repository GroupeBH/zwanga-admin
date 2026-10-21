const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
function load(name, customRequire = require) {
  const output = {};
  new Function(
    "exports",
    "require",
    ts.transpileModule(fs.readFileSync(path.join(__dirname, name), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  )(output, customRequire);
  return output;
}
const { storeDailyValues } = load("storePresentation.ts");
test("missing report days remain null, while an observed zero is preserved", () => {
  assert.deepEqual(
    storeDailyValues("2026-10-01", "2026-10-03", [
      { date: "2026-10-01", value: "0" },
      { date: "2026-10-03", value: "4" },
    ]),
    [
      { date: "2026-10-01", value: 0 },
      { date: "2026-10-02", value: null },
      { date: "2026-10-03", value: 4 },
    ],
  );
  assert.deepEqual(storeDailyValues("bad", "2026-10-03", []), []);
  assert.equal(
    storeDailyValues("2026-10-01", "2026-10-01", [
      { date: "2026-10-01", value: "" },
    ])[0].value,
    null,
  );
});
test("all Store calls reuse authenticated baseApi and publication sends an approved revision", () => {
  let endpoints;
  load("storesApi.ts", (name) => {
    assert.equal(name, "../api/baseApi");
    return {
      baseApi: {
        injectEndpoints: (options) => {
          endpoints = options.endpoints({
            query: (x) => x,
            mutation: (x) => x,
          });
          return {};
        },
      },
    };
  });
  assert.equal(endpoints.getStoreStatus.query(), "/admin/stores/status");
  const publish = endpoints.replyStoreReview.query({
    id: "review",
    revision: 3,
    requestId: "intent",
  });
  assert.deepEqual(publish, {
    url: "/admin/stores/reviews/review/reply",
    method: "POST",
    body: { revision: 3, requestId: "intent" },
  });
  assert.equal(Object.hasOwn(publish.body, "text"), false);
  const job = endpoints.syncStore.query({
    platform: "google",
    task: "reports",
    requestId: "stable",
    from: "2026-10-01",
    to: "2026-10-02",
  });
  assert.equal(job.body.requestId, "stable");
  assert.equal(job.url, "/admin/stores/google/sync");
});
