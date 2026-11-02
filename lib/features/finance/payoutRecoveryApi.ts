import { baseApi } from "../api/baseApi";
import {
  payoutPath,
  type PayoutTarget,
  type PayoutRecoveryDetail,
  type RecoveryWithdrawal,
  type ReferralWithdrawalDetail,
  type ResolveNotPaidPayload,
} from "./payoutRecovery";

// Refresh balances and history even after an ambiguous network failure.
const financialTags = ["Payments", "Referrals", "Wallets", "Users", "Dashboard"] as const;

export const payoutRecoveryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDriverPayoutReviews: builder.query<
      { data: RecoveryWithdrawal[]; total: number; limit: number; offset: number },
      { limit: number; offset: number; view?: "review" | "pending" | "resolved" }
    >({
      query: (params) => ({ url: "/admin/driver-payouts", params }),
      providesTags: ["Payments"],
    }),
    getPayoutRecoveryDetail: builder.query<PayoutRecoveryDetail, PayoutTarget>({
      query: payoutPath,
      transformResponse: (
        raw: PayoutRecoveryDetail | ReferralWithdrawalDetail,
        _meta,
        { kind },
      ) => {
        if (kind === "driver") return raw as PayoutRecoveryDetail;
        const withdrawal = raw as ReferralWithdrawalDetail;
        return {
          payout: withdrawal,
          resolution: withdrawal.resolution,
          lateSuccessAfterRelease: withdrawal.lateSuccessAfterRelease,
        };
      },
      providesTags: (_result, _error, { kind }) =>
        kind === "driver" ? ["Payments"] : ["Referrals"],
      keepUnusedDataFor: 0,
    }),
    reconcilePayoutRecovery: builder.mutation<
      RecoveryWithdrawal,
      PayoutTarget & { orderNumber?: string }
    >({
      query: ({ orderNumber, ...target }) => ({
        url: `${payoutPath(target)}/reconcile`,
        method: "POST",
        body: target.kind === "driver" && orderNumber?.trim()
          ? { orderNumber: orderNumber.trim() }
          : {},
      }),
      invalidatesTags: [...financialTags],
    }),
    resolvePayoutNotPaid: builder.mutation<
      RecoveryWithdrawal,
      PayoutTarget & { body: ResolveNotPaidPayload }
    >({
      query: ({ body, ...target }) => ({
        url: `${payoutPath(target)}/resolve-not-paid`,
        method: "POST",
        body,
      }),
      invalidatesTags: [...financialTags],
    }),
    closeDriverPayoutIncident: builder.mutation<
      RecoveryWithdrawal,
      { id: string; body: { reason: string; evidenceReference: string } }
    >({
      query: ({ id, body }) => ({
        url: `${payoutPath({ kind: "driver", id })}/close-late-success`,
        method: "POST",
        body,
      }),
      invalidatesTags: [...financialTags],
    }),
    retryPayout: builder.mutation<RecoveryWithdrawal, PayoutTarget & {
      body: ResolveNotPaidPayload & { confirmedNotReceived: true };
    }>({
      query: ({ body, ...target }) => ({ url: `${payoutPath(target)}/retry`, method: "POST", body }),
      invalidatesTags: [...financialTags],
    }),
  }),
});

export const {
  useGetDriverPayoutReviewsQuery,
  useGetPayoutRecoveryDetailQuery,
  useReconcilePayoutRecoveryMutation,
  useResolvePayoutNotPaidMutation,
  useCloseDriverPayoutIncidentMutation,
  useRetryPayoutMutation,
} = payoutRecoveryApi;
