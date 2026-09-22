import { baseApi } from "../api/baseApi";
import type { KycDocument, KycStatus } from "../admin/types";
import { listProvidesTags, unwrapList } from "@/lib/utils/toList";

interface VerifyKycPayload {
  kycId: string;
  approved: boolean;
  reason?: string;
}

export type KycStatusFilter = KycStatus | "all";

export interface KycQueryParams {
  page?: number;
  limit?: number;
  status?: KycStatusFilter;
  search?: string;
}

export interface PaginatedKycResponse {
  documents: KycDocument[];
  total: number;
  page: number;
  limit: number;
}

export const kycApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPendingKycs: builder.query<KycDocument[], void>({
      query: () => ({
        url: "/admin/kyc/pending",
      }),
      transformResponse: (response: unknown) =>
        unwrapList<KycDocument>(response, "documents"),
      providesTags: (result) => listProvidesTags("KYC", result),
    }),
    getKycDocuments: builder.query<PaginatedKycResponse, KycQueryParams | void>({
      query: ({ page = 1, limit = 20, status, search } = {}) => ({
        url: "/admin/kyc",
        params: {
          page,
          limit,
          ...(status && status !== "all" ? { status } : {}),
          ...(search ? { search } : {}),
        },
      }),
      serializeQueryArgs: ({ queryArgs }) => {
        const args = queryArgs ?? {};
        return `kyc-${args.page ?? 1}-${args.limit ?? 20}-${args.status ?? "all"}-${args.search ?? ""}`;
      },
      forceRefetch({ currentArg, previousArg }) {
        return (
          currentArg?.status !== previousArg?.status ||
          currentArg?.page !== previousArg?.page ||
          currentArg?.search !== previousArg?.search ||
          currentArg?.limit !== previousArg?.limit
        );
      },
      transformResponse: (response: unknown): PaginatedKycResponse => {
        const documents = unwrapList<KycDocument>(response, "documents");
        const record =
          response && typeof response === "object" && !Array.isArray(response)
            ? (response as Record<string, unknown>)
            : {};
        return {
          documents,
          total: typeof record.total === "number" ? record.total : documents.length,
          page: typeof record.page === "number" ? record.page : 1,
          limit: typeof record.limit === "number" ? record.limit : documents.length,
        };
      },
      providesTags: (result) => listProvidesTags("KYC", result?.documents),
    }),
    getKycDocument: builder.query<KycDocument, string>({
      query: (kycId) => `/admin/kyc/${kycId}`,
      providesTags: (_result, _error, id) => [{ type: "KYC", id }],
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
  overrideExisting: true,
});

export const {
  useGetPendingKycsQuery,
  useGetKycDocumentsQuery,
  useGetKycDocumentQuery,
  useVerifyKycMutation,
} = kycApi;
