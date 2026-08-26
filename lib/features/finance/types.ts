import type {
  PaymentMethod,
  PaymentStatus,
  PaymentTransaction,
  SanitizedUser,
} from "../admin/types";

export interface AdminFinanceUser extends SanitizedUser {
  email?: string | null;
}

export interface AdminPaymentTransaction extends PaymentTransaction {
  user?: AdminFinanceUser | null;
}

export type PaymentPurpose =
  | "generic"
  | "subscription_pro"
  | "trip_booking"
  | "wallet_top_up"
  | "driver_payout"
  | "referral_payout";

export interface CurrencyTotal {
  currency: string;
  amount: number;
}

export interface AdminPaymentSummary {
  total: number;
  pending: number;
  succeeded: number;
  failed: number;
  succeededVolume: CurrencyTotal[];
}

export interface AdminPaymentsResponse {
  payments: AdminPaymentTransaction[];
  total: number;
  page: number;
  limit: number;
  summary: AdminPaymentSummary;
  source: "admin-api" | "user-details-fallback";
  notice?: string;
}

export interface AdminPaymentsQuery {
  page?: number;
  limit?: number;
  status?: PaymentStatus | "all";
  purpose?: PaymentPurpose | "all";
  method?: PaymentMethod | "all";
  search?: string;
}

export interface WalletAccount {
  id: string;
  userId: string;
  user?: AdminFinanceUser | null;
  type: "points";
  balance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export type WalletLedgerEntryType =
  | "top_up"
  | "loyalty_reward"
  | "booking_payment"
  | "booking_refund"
  | "booking_fare_adjustment"
  | "subscription_payment"
  | "subscription_reward"
  | "transfer_out"
  | "transfer_in"
  | "admin_adjustment";

export interface WalletLedgerEntry {
  id: string;
  accountId: string;
  userId: string;
  user?: AdminFinanceUser | null;
  accountType: "points";
  type: WalletLedgerEntryType;
  amount: number;
  balanceAfter: number;
  currency: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  paymentTransactionId: string | null;
  description: string | null;
  createdAt: string;
}

export interface WalletSummary {
  accounts: number;
  totalBalance: number;
  positiveBalances: number;
  negativeBalances: number;
  currency: string;
}

export interface AdminWalletAccountsResponse {
  accounts: WalletAccount[];
  total: number;
  page: number;
  limit: number;
  summary: WalletSummary;
}

export interface AdminWalletLedgerResponse {
  entries: WalletLedgerEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminWalletQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: WalletLedgerEntryType | "all";
}

export interface AdjustWalletPayload {
  userId: string;
  amount: number;
  reason: string;
}

export interface ReferralAccount {
  id: string;
  userId: string;
  user?: AdminFinanceUser | null;
  profile?: {
    code: string;
    shareLinkUrl: string | null;
    referredByUserId: string | null;
    attributionProvider: string | null;
    qualifiedAt: string | null;
    rewardWindowEndsAt: string | null;
  } | null;
  pendingTokens: number;
  availableTokens: number;
  reservedTokens: number;
  withdrawnTokens: number;
  currency: string;
  directReferralsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type ReferralRewardStatus = "pending" | "available" | "reversed";
export type ReferralRewardSource = "subscription_payment" | "booking_payment";

export interface ReferralReward {
  id: string;
  referrerUserId: string;
  referrerUser?: AdminFinanceUser | null;
  referredUserId: string;
  referredUser?: AdminFinanceUser | null;
  sourceType: ReferralRewardSource;
  sourceEntityId: string;
  paymentTransactionId: string;
  grossAmount: number;
  sourceCurrency: string;
  rate: number;
  rewardAmount: number;
  rewardTokens: number;
  sourceMoneyPerToken: number;
  status: ReferralRewardStatus;
  holdUntil: string;
  availableAt: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ReferralWithdrawalStatus =
  | "pending"
  | "initiated"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface ReferralWithdrawal {
  id: string;
  userId: string;
  user?: AdminFinanceUser | null;
  tokens: number;
  amount: number;
  currency: string;
  moneyPerToken: number;
  phone: string;
  status: ReferralWithdrawalStatus;
  paymentTransactionId: string | null;
  paymentTransaction?: AdminPaymentTransaction | null;
  requestedAt: string;
  processedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralSummary {
  accounts: number;
  referredUsers: number;
  pendingTokens: number;
  availableTokens: number;
  reservedTokens: number;
  withdrawnTokens: number;
  pendingWithdrawals: number;
  currency: string;
}

export interface AdminReferralAccountsResponse {
  accounts: ReferralAccount[];
  total: number;
  page: number;
  limit: number;
  summary: ReferralSummary;
}

export interface AdminReferralRewardsResponse {
  rewards: ReferralReward[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminReferralWithdrawalsResponse {
  withdrawals: ReferralWithdrawal[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminReferralQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: ReferralRewardStatus | ReferralWithdrawalStatus | "all";
}

export interface ReconcileResult {
  message?: string;
  status?: string;
}
