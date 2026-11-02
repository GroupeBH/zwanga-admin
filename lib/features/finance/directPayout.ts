export const directPayoutStorageKey = (actorId: string) => `zwanga:direct-payout:${actorId}`;
export function directPayoutInputError(phone: string, amount: string, reason: string) {
  if (!/^\+?243[89]\d{8}$/.test(phone.trim())) return 'Saisissez un numéro Mobile Money au format +243…';
  if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) < 1 || Number(amount) > 99999999.99)
    return 'Saisissez un montant CDF positif, avec au maximum deux décimales.';
  if (reason.trim().length < 5 || reason.trim().length > 500) return 'Le motif doit contenir de 5 à 500 caractères.';
  return null;
}
export function directPayoutStatusMessage(status?: string) {
  if (status === 'succeeded') return 'Versement confirmé par le prestataire.';
  if (status === 'failed' || status === 'cancelled') return 'Versement échoué ou annulé. Vérifiez le dossier avant de créer un autre ordre.';
  return 'Versement non confirmé. Consultez son statut ; ne créez pas un second ordre pour le même paiement.';
}
