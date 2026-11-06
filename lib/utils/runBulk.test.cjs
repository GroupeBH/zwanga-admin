const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const exports_ = {};
new Function(
  "exports",
  "require",
  ts.transpileModule(fs.readFileSync(path.join(__dirname, "runBulk.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
)(exports_, require);
const { runBulk, bulkSummary } = exports_;

test("items run one after another and every failure is kept", async () => {
  const order = [], progress = [];
  let running = 0;
  const result = await runBulk(
    ["a", "b", "c"],
    async (item) => {
      running += 1;
      assert.equal(running, 1, "never two calls at once");
      order.push(item);
      await new Promise((resolve) => setImmediate(resolve));
      running -= 1;
      if (item === "b") throw new Error("refused");
    },
    (done, total) => progress.push(`${done}/${total}`),
  );
  assert.deepEqual(order, ["a", "b", "c"]);
  assert.deepEqual(progress, ["0/3", "1/3", "2/3", "3/3"]);
  assert.equal(result.succeeded, 2);
  assert.deepEqual(result.failed.map((f) => f.item), ["b"]);
});

test("a partial batch is never reported as a full success", () => {
  assert.match(bulkSummary(3, 0, "ticket"), /^3 tickets mis à jour\.$/);
  assert.match(bulkSummary(2, 1, "signalement"), /1 en échec/);
});
