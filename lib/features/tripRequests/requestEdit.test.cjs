const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const loaded = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, 'requestEdit.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(loaded.exports);
const { toDateInput, canEditRequest, buildRequestPatch } = loaded.exports;
const now = Date.parse('2026-10-08T12:00:00Z');
const request = { status: 'pending', departureLocation: 'Gombe', arrivalLocation: 'Limete',
  departureDateMin: '2026-10-08T11:00:12.123Z', departureDateMax: '2026-10-08T12:30:34.567Z',
  departureReference: null, arrivalReference: null, description: null, numberOfSeats: 1,
  maxPricePerSeat: 5000, paymentMode: 'cash', updatedAt: '2026-10-08T10:00:00.000Z', driverOffers: [] };
test('datetime-local uses local time and unchanged fields preserve source seconds', () => {
  const date = new Date(request.departureDateMin);
  assert.equal(toDateInput(request.departureDateMin).slice(-5), `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
  const form = { departureDateMin: toDateInput(request.departureDateMin), departureDateMax: toDateInput(request.departureDateMax), description: '' };
  assert.deepEqual(buildRequestPatch(request, form, now), {});
  assert.deepEqual(buildRequestPatch(request, { ...form, description: 'New' }, now), { description: 'New', expectedUpdatedAt: request.updatedAt });
});
test('reopening requires a complete future window and includes both dates', () => {
  const expired = { ...request, status: 'expired' };
  assert.throws(() => buildRequestPatch(expired, {}, now), /futur/);
  const form = { departureDateMin: toDateInput('2026-10-09T10:00:00Z'), departureDateMax: toDateInput('2026-10-09T11:00:00Z') };
  assert.deepEqual(buildRequestPatch(expired, form, now), { departureDateMin: '2026-10-09T10:00:00.000Z', departureDateMax: '2026-10-09T11:00:00.000Z', expectedUpdatedAt: request.updatedAt });
  assert.throws(() => buildRequestPatch(expired, { ...form, departureDateMax: form.departureDateMin }, now));
});
test('assigned and cancelled requests cannot be edited, including expired assigned history', () => {
  assert.equal(canEditRequest({ ...request, status: 'expired' }), true);
  for (const extra of [{ status: 'cancelled' }, { selectedDriver: { id: 'driver' } }, { selectedDriverId: 'driver' }, { tripId: 'trip' }, { driverOffers: [{ status: 'accepted' }] }]) {
    assert.equal(canEditRequest({ ...request, ...extra }), false);
    assert.throws(() => buildRequestPatch({ ...request, ...extra }, { description: 'New' }, now));
  }
});
