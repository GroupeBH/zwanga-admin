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
