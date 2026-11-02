const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const filename = path.join(__dirname, '../app/(admin)/app-updates/updateCampaignIntent.ts');
function load() {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const loaded = { exports: {} };
  new Function('exports', 'module', compiled)(loaded.exports, loaded);
  return loaded.exports.updateCampaignIntent;
}
test('lost campaign response and page reload reuse the saved intent; edited message gets a new intent', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  let counter = 0; const uuid = () => `synthetic-${++counter}`;
  assert.equal(load()('message A', storage, uuid), 'synthetic-1');
  assert.equal(load()('message A', storage, uuid), 'synthetic-1');
  assert.equal(load()('message B', storage, uuid), 'synthetic-2');
});
test('a blocked or corrupt session store never silently creates another campaign', () => {
  assert.throws(() => load()('A', { getItem: () => '{broken' }, () => { throw Error('must not generate'); }));
  assert.throws(() => load()('A', { getItem: () => null, setItem: () => { throw Error('disk blocked'); } }, () => 'synthetic-id'), /disk blocked/);
});
