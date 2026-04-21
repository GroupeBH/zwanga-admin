import { baseApi } from "../api/baseApi";
import type {
  DocumentFundingRequest,
  DocumentFundingRequestStatus,
  SubscriptionOffering,
} from "../admin/types";

export interface DocumentFundingRequestsQueryParams {
  status?: DocumentFundingRequestStatus | "all";
}

export const subscriptionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubscriptionPlans: builder.query<SubscriptionOffering[], void>({
      query: () => "/subscriptions/plans",
      providesTags: ["Subscriptions"],
    }),

    getDocumentFundingRequests: builder.query<
      DocumentFundingRequest[],
      DocumentFundingRequestsQueryParams | void
    >({
      query: ({ status } = {}) => ({
        url: "/subscriptions/document-funding-requests",
        params: status && status !== "all" ? { status } : undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Subscriptions" as const, id })),
              { type: "Subscriptions" as const, id: "DOCUMENT_FUNDING_LIST" },
            ]
          : [{ type: "Subscriptions" as const, id: "DOCUMENT_FUNDING_LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSubscriptionPlansQuery,
  useGetDocumentFundingRequestsQuery,
} = subscriptionsApi;
