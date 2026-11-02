import { isAdminRole, isSuperAdminRole } from "../auth/adminRoles";
import type { AdminPaymentTransaction, ReferralWithdrawal } from "./types";

export type PayoutKind = "driver" | "referral";
export interface PayoutTarget { kind: PayoutKind; id: string }

export interface RecoveryWithdrawal {
  id: string;
  status: ReferralWithdrawal["status"];
  amount: number;
  currency: string;
  phone: string;
  driverId?: string;
  userId?: string;
  user?: ReferralWithdrawal["user"];
  tokens?: number;
  requestedAt: string | null;
  processedAt: string | null;
  createdAt: string;
  failureReason: string | null;
  paymentTransactionId: string | null;
  paymentTransaction?: AdminPaymentTransaction | null;
  expectedReference?: string | null;
  canResolveNotPaid?: boolean;
  resolutionRequiresProviderConfirmation?: boolean;
  isStale?: boolean;
  requiresReview?: boolean;
  recoveryBlocked?: boolean;
  fundsReleasedAt?: string | null;
  canAdminRetry?: boolean;
  adminRetry?: { code: string; message: string; availableAt: string | null };
  retry?: { replacementId: string; actorId: string; evidenceReference: string; createdAt: string } | null;
  retryOf?: { sourceId: string } | null;
}

export interface PayoutRecoveryEvent {
  id: string;
  actorId: string | null;
  action: string;
  reason: string | null;
  evidenceReference: string | null;
  createdAt: string;
}

export interface ReferralResolution {
  actorId: string;
  expectedReference: string;
  reason: string;
  evidenceReference: string;
  createdAt: string;
}

export interface PayoutRecoveryDetail {
  payout: RecoveryWithdrawal;
  events?: PayoutRecoveryEvent[];
  resolution?: ReferralResolution | null;
  lateSuccessAfterRelease?: boolean;
}

export interface ReferralWithdrawalDetail extends ReferralWithdrawal {
  expectedReference?: string | null;
  canResolveNotPaid?: boolean;
  resolutionRequiresProviderConfirmation?: boolean;
  resolution?: ReferralResolution | null;
  lateSuccessAfterRelease?: boolean;
}

export interface ResolveNotPaidPayload {
  expectedReference: string;
  reason: string;
  evidenceReference: string;
  confirmedNotPaid: true;
}

export const canManagePayout = (kind: PayoutKind, role?: string | null) =>
  kind === "referral" ? isSuperAdminRole(role) : isAdminRole(role);

export const canRetryPayout = (payout: RecoveryWithdrawal, role?: string | null) =>
  isSuperAdminRole(role) && payout.canAdminRetry === true && !payout.retry &&
  !payout.recoveryBlocked && payout.status !== "succeeded" &&
  payout.paymentTransaction?.status !== "succeeded" &&
  typeof payout.expectedReference === "string" && !!payout.expectedReference.trim() && payout.expectedReference.length <= 120 &&
  ["pending", "initiated", "failed", "cancelled"].includes(payout.status) &&
  (!payout.paymentTransactionId || payout.paymentTransaction?.id === payout.paymentTransactionId) &&
  (!payout.paymentTransaction || payout.paymentTransaction.provider === "flexpay");

export const payoutRetryMessage = (payout: RecoveryWithdrawal) => {
  if (payout.retry) return "Une relance existe déjà. Consultez le versement de remplacement ; ne renvoyez pas l’ancien retrait.";
  if (payout.status === "succeeded" || payout.paymentTransaction?.status === "succeeded") return "Versement déjà confirmé : aucun nouvel envoi autorisé.";
  if (payout.recoveryBlocked) return "Incident financier à rapprocher avant toute relance.";
  if (payout.canAdminRetry === undefined) return "La version du backend ne fournit pas la capacité de relance. Mettez à jour le backend puis actualisez ce dossier.";
  if (payout.adminRetry?.message) return payout.adminRetry.message;
  if (payout.canAdminRetry) return "Confirmez la non-réception et la non-exécution définitive chez le prestataire. La relance conserve le montant et le numéro d’origine.";
  return "Relance indisponible dans cet état : vérifiez le délai de sécurité de 15 minutes et la cohérence du dossier, puis actualisez.";
};

export const payoutRetryResultMessage = (replacement: RecoveryWithdrawal) => {
  const reference = `Relance ${replacement.id}`;
  if (replacement.status === "succeeded")
    return `${reference} : versement confirmé par le prestataire. Consultez le nouveau dossier.`;
  if (["failed", "cancelled"].includes(replacement.status))
    return `${reference} : le nouveau versement a échoué ou a été annulé. Consultez son dossier avant toute nouvelle tentative.`;
  return `${reference} : nouveau versement en traitement. La réception de l’argent n’est pas encore confirmée. Suivez le nouveau dossier sans renvoyer l’ancien retrait.`;
};

// Fail closed for older APIs: absence of a capability is not authorization.
export const canReleasePayout = (payout: RecoveryWithdrawal) =>
  payout.canResolveNotPaid === true &&
  payout.resolutionRequiresProviderConfirmation === true &&
  typeof payout.expectedReference === "string" &&
  payout.expectedReference.trim().length > 0 &&
  payout.expectedReference.length <= 120 &&
  ["pending", "initiated"].includes(payout.status) &&
  !payout.recoveryBlocked &&
  (!payout.paymentTransactionId || payout.paymentTransaction?.id === payout.paymentTransactionId) &&
  (!payout.paymentTransaction || payout.paymentTransaction.provider === "flexpay") &&
  payout.paymentTransaction?.status !== "succeeded";

export const payoutEvidenceError = (reason: string, evidenceReference: string) => {
  if (reason.trim().length < 5 || reason.trim().length > 500)
    return "Le motif doit contenir entre 5 et 500 caractères.";
  if (evidenceReference.trim().length < 5 || evidenceReference.trim().length > 200)
    return "La référence de preuve doit contenir entre 5 et 200 caractères.";
  return null;
};

export const resolutionError = (
  payout: RecoveryWithdrawal,
  reason: string,
  evidenceReference: string,
  confirmedNotPaid: boolean,
) => {
  if (!canReleasePayout(payout))
    return "Ce retrait ne peut pas être libéré dans son état actuel. Actualisez le dossier.";
  if (confirmedNotPaid !== true)
    return "Confirmez la non-exécution définitive auprès du prestataire.";
  return payoutEvidenceError(reason, evidenceReference);
};

export const payoutPath = ({ kind, id }: PayoutTarget) =>
  `${kind === "driver" ? "/admin/driver-payouts" : "/admin/referrals/withdrawals"}/${encodeURIComponent(id)}`;
