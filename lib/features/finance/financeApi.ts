import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import type { AdminUserDetailsResponse } from "../admin/types";
import { baseApi } from "../api/baseApi";
import type {
  AdjustWalletPayload,
  AdminFinanceUser,
  AdminPaymentSummary,
  AdminPaymentsQuery,
  AdminPaymentsResponse,
  AdminPaymentTransaction,
  AdminReferralAccountsResponse,
  AdminReferralQuery,
  AdminReferralRewardsResponse,
  AdminReferralWithdrawalsResponse,
  AdminWalletAccountsResponse,
  AdminWalletLedgerResponse,
  AdminWalletQuery,
  ReconcileResult,
  ReferralWithdrawal,
  WalletAccount,
} from "./types";

const toNumber = (value: unknown) => Number(value ?? 0);

const summarizePayments = (
  payments: AdminPaymentTransaction[]
): AdminPaymentSummary => {
  const volume = new Map<string, number>();

  for (const payment of payments) {
    if (payment.status !== "succeeded") continue;
    volume.set(
      payment.currency,
      (volume.get(payment.currency) ?? 0) + toNumber(payment.amount)
    );
  }

  return {
    total: payments.length,
    pending: payments.filter((item) =>
      ["pending", "initiated"].includes(item.status)
    ).length,
    succeeded: payments.filter((item) => item.status === "succeeded").length,
    failed: payments.filter((item) =>
      ["failed", "cancelled"].includes(item.status)
    ).length,
    succeededVolume: Array.from(volume, ([currency, amount]) => ({
      currency,
      amount,
    })),
  };
};

const normalizePayments = (
  raw: any,
  query: AdminPaymentsQuery
): AdminPaymentsResponse => {
  const payments = (Array.isArray(raw) ? raw : raw?.payments ?? []).map(
    (payment: AdminPaymentTransaction) => ({
      ...payment,
      amount: toNumber(payment.amount),
    })
  );

  return {
    payments,
    total: Number(raw?.total ?? payments.length),
    page: Number(raw?.page ?? query.page ?? 1),
    limit: Number(raw?.limit ?? query.limit ?? 25),
    summary: raw?.summary ?? summarizePayments(payments),
    source: "admin-api",
  };
};

const isNotFound = (error?: FetchBaseQueryError) => error?.status === 404;

const matchesFallbackQuery = (
  payment: AdminPaymentTransaction,
  query: AdminPaymentsQuery
) => {
  if (query.status && query.status !== "all" && payment.status !== query.status) {
    return false;
  }
  if (query.purpose && query.purpose !== "all" && payment.purpose !== query.purpose) {
    return false;
  }
  if (query.method && query.method !== "all" && payment.method !== query.method) {
    return false;
  }

  const search = query.search?.trim().toLowerCase();
  if (!search) return true;

  const userName = payment.user
    ? `${payment.user.firstName} ${payment.user.lastName}`.toLowerCase()
    : "";
  return [
    payment.reference,
    payment.orderNumber,
    payment.providerReference,
    payment.phone,
    payment.description,
    userName,
  ].some((value) => value?.toLowerCase().includes(search));
};

export const financeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminPayments: builder.query<AdminPaymentsResponse, AdminPaymentsQuery | void>({
      async queryFn(arg, _api, _extraOptions, fetchWithBQ) {
        const query = arg ?? {};
        const params = {
          page: query.page ?? 1,
          limit: query.limit ?? 25,
          status: query.status && query.status !== "all" ? query.status : undefined,
          purpose: query.purpose && query.purpose !== "all" ? query.purpose : undefined,
          method: query.method && query.method !== "all" ? query.method : undefined,
          search: query.search || undefined,
        };
        const result = await fetchWithBQ({ url: "/admin/payments", params });

        if (!result.error) {
          return { data: normalizePayments(result.data, query) };
        }
        if (!isNotFound(result.error as FetchBaseQueryError)) {
          return { error: result.error as FetchBaseQueryError };
        }

        // Temporary compatibility path for the current backend: collect payments
        // already exposed in the first 20 admin user detail records. Keeping
        // this below the backend's 30 req/min admin throttle avoids flooding it.
        const usersResult = await fetchWithBQ({
          url: "/admin/users",
          params: { page: 1, limit: 20 },
        });
        if (usersResult.error) {
          return { error: result.error as FetchBaseQueryError };
        }

        const users = ((usersResult.data as any)?.users ?? []) as AdminFinanceUser[];
        const detailResults = await Promise.all(
          users.map((user) => fetchWithBQ(`/admin/users/${user.id}/details`))
        );
        const collected = detailResults.flatMap((detailResult) => {
          if (detailResult.error) return [];
          const details = detailResult.data as AdminUserDetailsResponse;
          return (details.payments ?? []).map((payment) => ({
            ...payment,
            amount: toNumber(payment.amount),
            user: details.user as AdminFinanceUser,
          }));
        });

        const uniquePayments = Array.from(
          new Map(collected.map((payment) => [payment.id, payment])).values()
        ).sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const filtered = uniquePayments.filter((payment) =>
          matchesFallbackQuery(payment, query)
        );
        const page = query.page ?? 1;
        const limit = query.limit ?? 25;
        const start = (page - 1) * limit;

        return {
          data: {
            payments: filtered.slice(start, start + limit),
            total: filtered.length,
            page,
            limit,
            summary: summarizePayments(uniquePayments),
            source: "user-details-fallback",
            notice:
              "Vue de compatibilite limitee aux 20 premiers utilisateurs. Ajoutez GET /admin/payments pour une couverture exhaustive.",
          },
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.payments.map(({ id }) => ({ type: "Payments" as const, id })),
              { type: "Payments" as const, id: "LIST" },
            ]
          : [{ type: "Payments" as const, id: "LIST" }],
    }),

    reconcileAdminPayment: builder.mutation<ReconcileResult, string>({
      query: (paymentId) => ({
        url: `/admin/payments/${paymentId}/reconcile`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Payments", id },
        { type: "Payments", id: "LIST" },
        "Wallets",
        "Referrals",
      ],
    }),

    getAdminWalletAccounts: builder.query<
      AdminWalletAccountsResponse,
      AdminWalletQuery
    >({
      query: (arg) => ({
        url: "/admin/wallets",
        params: {
          page: arg.page ?? 1,
          limit: arg.limit ?? 25,
          search: arg.search || undefined,
        },
      }),
      transformResponse: (raw: any, _meta, arg) => {
        const accounts = (raw?.accounts ?? []).map((account: WalletAccount) => ({
          ...account,
          balance: toNumber(account.balance),
        }));
        return {
          ...raw,
          accounts,
          total: Number(raw?.total ?? accounts.length),
          page: Number(raw?.page ?? arg.page ?? 1),
          limit: Number(raw?.limit ?? arg.limit ?? 25),
        } as AdminWalletAccountsResponse;
      },
      providesTags: ["Wallets"],
    }),

    getAdminWalletLedger: builder.query<
      AdminWalletLedgerResponse,
      AdminWalletQuery
    >({
      query: (arg) => ({
        url: "/admin/wallets/ledger",
        params: {
          page: arg.page ?? 1,
          limit: arg.limit ?? 25,
          search: arg.search || undefined,
          type: arg.type && arg.type !== "all" ? arg.type : undefined,
        },
      }),
      providesTags: ["Wallets"],
    }),

    adjustAdminWallet: builder.mutation<WalletAccount, AdjustWalletPayload>({
      query: ({ userId, amount, reason, requestId }) => ({
        url: `/admin/wallets/${userId}/adjustments`,
        method: "POST",
        body: { amount, reason, requestId },
      }),
      invalidatesTags: ["Wallets"],
    }),

    getAdminReferralAccounts: builder.query<
      AdminReferralAccountsResponse,
      AdminReferralQuery
    >({
      query: (arg) => ({
        url: "/admin/referrals/accounts",
        params: {
          page: arg.page ?? 1,
          limit: arg.limit ?? 25,
          search: arg.search || undefined,
        },
      }),
      providesTags: ["Referrals"],
    }),

    getAdminReferralRewards: builder.query<
      AdminReferralRewardsResponse,
      AdminReferralQuery
    >({
      query: (arg) => ({
        url: "/admin/referrals/rewards",
        params: {
          page: arg.page ?? 1,
          limit: arg.limit ?? 25,
          search: arg.search || undefined,
          status: arg.status && arg.status !== "all" ? arg.status : undefined,
        },
      }),
      providesTags: ["Referrals"],
    }),

    getAdminReferralWithdrawals: builder.query<
      AdminReferralWithdrawalsResponse,
      AdminReferralQuery
    >({
      query: (arg) => ({
        url: "/admin/referrals/withdrawals",
        params: {
          page: arg.page ?? 1,
          limit: arg.limit ?? 25,
          search: arg.search || undefined,
          status: arg.status && arg.status !== "all" ? arg.status : undefined,
        },
      }),
      providesTags: ["Referrals"],
    }),

    reconcileReferralWithdrawal: builder.mutation<
      ReferralWithdrawal,
      string
    >({
      query: (withdrawalId) => ({
        url: `/admin/referrals/withdrawals/${withdrawalId}/reconcile`,
        method: "POST",
      }),
      invalidatesTags: ["Referrals", "Payments"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAdminPaymentsQuery,
  useReconcileAdminPaymentMutation,
  useGetAdminWalletAccountsQuery,
  useGetAdminWalletLedgerQuery,
  useAdjustAdminWalletMutation,
  useGetAdminReferralAccountsQuery,
  useGetAdminReferralRewardsQuery,
  useGetAdminReferralWithdrawalsQuery,
  useReconcileReferralWithdrawalMutation,
} = financeApi;
