import { getApiErrorMessage, getApiErrorStatus } from '../../utils/apiErrors';
import type { ReconcileResult } from './types';

export function paymentReconciliationError(error: unknown): string {
  const status = getApiErrorStatus(error);
  if (status === 401) return 'Session expirée. Reconnectez-vous avant de vérifier le paiement.';
  if (status === 403) return 'Cette vérification est réservée au super administrateur.';
  if (status === 404) {
    const message = getApiErrorMessage(error, '');
    return message && !/^Cannot POST\b/i.test(message)
      ? message
      : 'Transaction introuvable ou route de rapprochement absente sur ce backend.';
  }
  if (status === 429) return 'Trop de vérifications rapprochées. Patientez avant de réessayer.';
  if (status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR')
    return 'Réponse du serveur indisponible. Actualisez le statut avant de réessayer. Aucun nouvel envoi demandé.';
  return getApiErrorMessage(error, 'Le rapprochement n’a pas abouti. Actualisez le statut avant de réessayer. Aucun nouvel envoi demandé.');
}

export function paymentReconciliationMessage(result: ReconcileResult): string {
  if (result.message) return result.message;
  // Older backends may omit completed. HTTP 200 alone never proves settlement.
  if (result.completed === true && result.status === 'succeeded')
    return 'Paiement confirmé et rapprochement appliqué. Aucun nouvel envoi effectué.';
  if (result.completed === true && ['failed', 'cancelled'].includes(result.status ?? ''))
    return 'Paiement échoué ou annulé ; rapprochement appliqué. Aucun nouvel envoi effectué.';
  return 'Résultat non confirmé. Actualisez le statut ou vérifiez auprès du prestataire. Aucun nouvel envoi effectué.';
}
