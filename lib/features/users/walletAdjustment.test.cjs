const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const loaded = { exports: {} };
const source = fs.readFileSync(
  path.join(__dirname, "walletAdjustment.ts"),
  "utf8",
);
new Function(
  "exports",
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(loaded.exports);
const { adjustmentError, readAdjustmentIntent } = loaded.exports;
const reason = "Correction autorisée par le support";
test("credit/debit validation respects amount precision, reason and available balance", () => {
  assert.equal(adjustmentError(25, reason, 0), null);
  assert.equal(adjustmentError(-25, reason, 25), null);
  assert.equal(adjustmentError(0.29, reason, 0), null);
  for (const amount of [0, NaN, Infinity, -Infinity, 0.001, 1000001])
    assert.ok(adjustmentError(amount, reason, 100));
  assert.ok(adjustmentError(-101, reason, 100));
  assert.ok(adjustmentError(1, "court", 10));
  assert.ok(adjustmentError(1, "x".repeat(401), 10));
});
test("uncertain requests retain their original ID and signed payload after a reload", () => {
  const intent = {
    requestId: "123e4567-e89b-12d3-a456-426614174000",
    userId: "user",
    amount: -25,
    reason,
  };
  assert.deepEqual(
    readAdjustmentIntent(JSON.stringify(intent), "user"),
    intent,
  );
  assert.equal(
    readAdjustmentIntent(JSON.stringify(intent), "another-user"),
    null,
  );
  assert.equal(readAdjustmentIntent("{broken", "user"), null);
  assert.equal(readAdjustmentIntent(null, "user"), null);
  for (const override of [
    { requestId: "bad-id" },
    { amount: "25" },
    { amount: 0.001 },
    { reason: 5 },
  ])
    assert.equal(
      readAdjustmentIntent(JSON.stringify({ ...intent, ...override }), "user"),
      null,
    );
});
