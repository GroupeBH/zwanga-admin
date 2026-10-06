import { baseApi } from "../api/baseApi";
import type {
  AdminFinanceUser,
  WalletAccount,
  WalletLedgerEntry,
} from "../finance/types";

export interface UserFinancialSummary {
  wallet: {
    account:
      | (WalletAccount & {
          withdrawableBalance: number;
          reservedWithdrawalBalance: number;
          withdrawalsBlocked: boolean;
        })
      | null;
    balance: number;
    entries: WalletLedgerEntry[];
  };
  referral: {
    referrer: AdminFinanceUser | null;
    referredAt: string | null;
    attributionProvider: string | null;
    canAttach: boolean;
    filleuls?: Array<{
      user: AdminFinanceUser;
      referredAt: string | null;
    }>;
  };
}

export const userFinancialApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserFinancialSummary: builder.query<UserFinancialSummary, string>({
      query: (userId) => `/admin/users/${userId}/financial-summary`,
      providesTags: (_result, _error, userId) => [
        "Wallets",
        "Referrals",
        { type: "Users", id: userId },
      ],
    }),
    searchReferrerCandidates: builder.query<
      { users: AdminFinanceUser[] },
      string
    >({
      query: (search) => ({
        url: "/admin/referrals/candidates",
        params: { search },
      }),
    }),
    attachUserReferrer: builder.mutation<
      { newlyAttached: boolean; attributionBonusTokens: number },
      { userId: string; referrerUserId: string; reason: string }
    >({
      query: ({ userId, ...body }) => ({
        url: `/admin/users/${userId}/referrer`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, error, { userId, referrerUserId }) =>
        error
          ? []
          : [
              "Referrals",
              { type: "Users", id: userId },
              { type: "Users", id: referrerUserId },
            ],
    }),
  }),
});

export const {
  useGetUserFinancialSummaryQuery,
  useSearchReferrerCandidatesQuery,
  useAttachUserReferrerMutation,
} = userFinancialApi;
