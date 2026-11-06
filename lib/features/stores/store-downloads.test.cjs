const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { renderToStaticMarkup } = require("react-dom/server");
const React = require("react");
function load(file, customRequire = require) {
  const exports = {};
  new Function(
    "exports",
    "require",
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
  )(exports, customRequire);
  return exports;
}
const presentation = load(path.join(__dirname, "storePresentation.ts"));
const filters = { from: "2026-01-01", to: "2026-01-03", country: "CD" };
const summary = {
  ...filters,
  generatedAt: "2026-01-05T00:00:00Z",
  metrics: [
    {
      platform: "google",
      metric: "google.device_installs",
      label: "Installations Android",
      definition: {
        source: "Google Play Console CSV",
        officialName: "Daily Device Installs",
      },
      latest: {
        date: "2026-01-04",
        value: "11.000000",
        importedAt: "2026-01-05T00:00:00Z",
      },
      period: {
        value: "5.000000",
        observedDays: 2,
        expectedDays: 3,
        availability: "partial",
      },
      daily: [
        { date: "2026-01-01", value: "5", importedAt: "2026-01-05T00:00:00Z" },
        { date: "2026-01-02", value: null, importedAt: null },
        { date: "2026-01-03", value: "0", importedAt: "2026-01-05T00:00:00Z" },
      ],
    },
  ],
};
function render(result) {
  const { StoreDownloads } = load(
    path.resolve(
      __dirname,
      "../../..",
      "app/(admin)/stores/StoreDownloads.tsx",
    ),
    (name) => {
      if (name === "react/jsx-runtime") return require(name);
      if (name.endsWith("/storesApi"))
        return {
          useGetStoreDownloadsQuery(args, options) {
            assert.deepEqual(args, filters);
            assert.deepEqual(options, presentation.STORE_DOWNLOAD_REFRESH);
            return { isFetching: false, refetch() {}, ...result };
          },
        };
      if (name.endsWith("/storePresentation")) return presentation;
      if (name.endsWith("/apiErrors"))
        return { getApiErrorMessage: () => "Service indisponible" };
      if (name.endsWith(".css"))
        return { default: new Proxy({}, { get: (_, key) => String(key) }) };
      throw new Error("Unexpected module: " + name);
    },
  );
  return renderToStaticMarkup(
    React.createElement(StoreDownloads, { filters, selectDay() {} }),
  );
}
test("counts preserve zero and large integers, without treating absent values as zero", () => {
  assert.equal(presentation.formatStoreCount("0.000000"), "0");
  assert.equal(
    presentation.formatStoreCount("9007199254740993.000000").replace(/\s/g, ""),
    "9007199254740993",
  );
  for (const missing of [null, undefined, "", "*", "NaN", "-1", "1.5"]) {
    assert.equal(presentation.formatStoreCount(missing), "Indisponible");
  }
});
test("polls only while focused, and refreshes after reconnect/focus/navigation", () => {
  assert.deepEqual(presentation.STORE_DOWNLOAD_REFRESH, {
    pollingInterval: 15000,
    skipPollingIfUnfocused: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    refetchOnMountOrArgChange: true,
  });
});
test("renders latest report independently of the period, source, coverage and nullable daily details using existing styles", () => {
  const html = render({ currentData: summary });
  for (const text of [
    "Installations Android",
    "2026-01-04",
    "2026-01-01",
    "2026-01-03",
    "Google Play Console CSV",
    "Daily Device Installs",
    "Données partielles",
    "Indisponible",
    "Voir ce jour",
    "15 secondes",
  ])
    assert.ok(html.includes(text), text);
  assert.match(html, /<h2>11<\/h2>/);
  assert.match(html, />0<\/td>/);
  assert.match(html, /class="card"/);
});
test("does not render previous filter results during loading", () => {
  const html = render({
    data: summary,
    currentData: undefined,
    isFetching: true,
  });
  assert.match(html, /Chargement des derniers rapports/);
  assert.ok(!html.includes("2026-01-04"));
});
test("retains known same-filter data but clearly warns when refresh fails", () => {
  const html = render({ currentData: summary, error: { status: 503 } });
  assert.match(html, /role="alert"/);
  assert.ok(html.includes("Service indisponible"));
  assert.ok(html.includes("n’ont pas pu être actualisées"));
  assert.ok(html.includes("2026-01-04"));
});
