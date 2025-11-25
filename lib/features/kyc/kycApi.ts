import { baseApi } from "../api/baseApi";
import type { KycDocument } from "../admin/types";

interface VerifyKycPayload {
  kycId: string;
  approved: boolean;
  reason?: string;
}

export const kycApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPendingKycs: builder.query<KycDocument[], void>({
      query: () => ({
        url: "/admin/kyc/pending",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "KYC" as const, id })),
              { type: "KYC" as const, id: "LIST" },
            ]
          : [{ type: "KYC" as const, id: "LIST" }],
    }),
    verifyKyc: builder.mutation<KycDocument, VerifyKycPayload>({
      query: ({ kycId, approved, reason }) => ({
        url: `/admin/kyc/${kycId}/verify`,
        method: "PUT",
        body: { approved, reason },
      }),
      invalidatesTags: (_result, _error, { kycId }) => [
        { type: "KYC", id: kycId },
        { type: "KYC", id: "LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const { useGetPendingKycsQuery, useVerifyKycMutation } = kycApi;

