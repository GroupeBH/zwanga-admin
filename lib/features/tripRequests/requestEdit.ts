import type { TripRequest } from '../admin/types';
import type { UpdateTripRequestPayload } from './tripRequestsApi';

export const toDateInput = (value: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const canEditRequest = (request: TripRequest) =>
  ['pending', 'offers_received', 'expired'].includes(request.status) &&
  !request.selectedDriver && !request.selectedDriverId && !request.tripId &&
  !request.driverOffers?.some(offer => offer.status === 'accepted');

export function buildRequestPatch(request: TripRequest, form: UpdateTripRequestPayload, now = Date.now()): UpdateTripRequestPayload {
  if (!canEditRequest(request)) throw new Error('Cette demande est déjà prise en charge ou annulée.');
  const patch: UpdateTripRequestPayload = {};
  const reopening = request.status === 'expired' || Date.parse(request.departureDateMax) + 3 * 60 * 60 * 1000 <= now;
  if (reopening && (!form.departureDateMin || !form.departureDateMax))
    throw new Error('Choisissez un nouveau créneau complet dans le futur.');
  for (const field of ['departureDateMin', 'departureDateMax'] as const) {
    const value = form[field];
    if (value !== undefined && (reopening || value !== toDateInput(request[field]))) {
      if (!Number.isFinite(Date.parse(value))) throw new Error('Choisissez un créneau valide.');
      patch[field] = new Date(value).toISOString();
    }
  }
  const min = Date.parse(patch.departureDateMin ?? request.departureDateMin);
  const max = Date.parse(patch.departureDateMax ?? request.departureDateMax);
  if (min >= max || (reopening || patch.departureDateMin) && min <= now)
    throw new Error('Choisissez un nouveau créneau dans le futur, avec une fin après le début.');
  for (const field of ['departureLocation', 'arrivalLocation', 'departureReference', 'arrivalReference', 'description'] as const) {
    if (form[field] !== undefined && (form[field] ?? '') !== (request[field] ?? '')) patch[field] = form[field] ?? '';
  }
  if (form.numberOfSeats !== undefined && form.numberOfSeats !== request.numberOfSeats) patch.numberOfSeats = form.numberOfSeats;
  if (form.maxPricePerSeat != null && Number(form.maxPricePerSeat) !== Number(request.maxPricePerSeat)) patch.maxPricePerSeat = form.maxPricePerSeat;
  if (form.paymentMode !== undefined && form.paymentMode !== request.paymentMode) patch.paymentMode = form.paymentMode;
  if (Object.keys(patch).length) patch.expectedUpdatedAt = request.updatedAt;
  return patch;
}
