const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
function load(name) {
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
  )(output, require);
  return output;
}
const {
  summarizeJobs,
  jobsByDay,
  freshness,
  seriesStats,
  cohortFunnel,
  dayRange,
} = load("storeMonitoring.ts");
const NOW = Date.parse("2026-11-05T12:00:00Z");

test("success rate ignores runs that are still in progress", () => {
  const summary = summarizeJobs([
    { state: "succeeded" },
    { state: "succeeded" },
    { state: "failed" },
    { state: "unknown" },
    { state: "running" },
  ]);
  assert.equal(summary.successRate, 50);
  assert.deepEqual(summary.counts, {
    good: 2,
    warning: 1,
    critical: 1,
    running: 1,
    other: 0,
  });
  assert.equal(summarizeJobs([{ state: "queued" }]).successRate, null);
});

test("days older than a truncated job list are unknown, not empty", () => {
  const jobs = [
    { state: "succeeded", createdAt: "2026-11-05T08:00:00Z" },
    { state: "failed", createdAt: "2026-11-04T08:00:00Z" },
  ];
  const truncated = jobsByDay(jobs, 3, true, NOW);
  assert.deepEqual(
    truncated.map((d) => d.date),
    ["2026-11-03", "2026-11-04", "2026-11-05"],
  );
  assert.equal(truncated[0].counts, null);
  assert.equal(truncated[1].counts.critical, 1);
  assert.equal(truncated[2].counts.good, 1);
  assert.equal(jobsByDay(jobs, 3, false, NOW)[0].counts.good, 0);
});

test("freshness ages from fresh to stale and flags failed imports", () => {
  const hoursAgo = (h) => new Date(NOW - h * 3600000).toISOString();
  assert.equal(freshness(hoursAgo(2), "succeeded", NOW).tone, "good");
  assert.equal(freshness(hoursAgo(40), "succeeded", NOW).tone, "warning");
  assert.equal(freshness(hoursAgo(100), "succeeded", NOW).tone, "critical");
  assert.equal(freshness(hoursAgo(2), "failed", NOW).tone, "critical");
  assert.equal(freshness(null, "succeeded", NOW).tone, "neutral");
});

test("series statistics skip missing days instead of counting zeros", () => {
  const stats = seriesStats([
    { date: "2026-11-01", value: 4 },
    { date: "2026-11-02", value: null },
    { date: "2026-11-03", value: 0 },
    { date: "2026-11-04", value: 8 },
  ]);
  assert.equal(stats.total, 12);
  assert.equal(stats.average, 4);
  assert.equal(stats.observed, 3);
  assert.deepEqual(stats.peak, { date: "2026-11-04", value: 8 });
  assert.equal(seriesStats([{ date: "2026-11-01", value: null }]), null);
});

test("funnel percentages are relative to registrations and the previous step", () => {
  const funnel = cohortFunnel([
    { registrations: 10, kycSubmitted: 8, kycApproved: 4, firstTripCompleted: 1 },
    { registrations: 10, kycSubmitted: 2, kycApproved: 1, firstTripCompleted: 1 },
  ]);
  assert.deepEqual(
    funnel.map((s) => [s.value, s.ofFirst, s.ofPrevious]),
    [
      [20, 100, null],
      [10, 50, 50],
      [5, 25, 50],
      [2, 10, 40],
    ],
  );
  assert.equal(cohortFunnel([])[0].ofFirst, null);
});

test("day ranges are inclusive and bounded", () => {
  assert.deepEqual(dayRange("2026-10-30", "2026-11-01"), [
    "2026-10-30",
    "2026-10-31",
    "2026-11-01",
  ]);
  assert.deepEqual(dayRange("2026-11-02", "2026-11-01"), []);
  assert.deepEqual(dayRange("2025-01-01", "2026-11-01"), []);
});
