import { baseApi } from "../api/baseApi";
import type {
  DocumentFundingRequest,
  DocumentFundingRequestStatus,
  SubscriptionOffering,
} from "../admin/types";
import { listProvidesTags, unwrapList } from "@/lib/utils/toList";

export interface DocumentFundingRequestsQueryParams {
  status?: DocumentFundingRequestStatus | "all";
}

export const subscriptionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubscriptionPlans: builder.query<SubscriptionOffering[], void>({
      query: () => "/subscriptions/plans",
      transformResponse: (response: unknown) =>
        unwrapList<SubscriptionOffering>(response, "plans"),
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
      transformResponse: (response: unknown) =>
        unwrapList<DocumentFundingRequest>(response, "requests"),
      providesTags: (result) =>
        listProvidesTags("Subscriptions", result, "DOCUMENT_FUNDING_LIST"),
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetSubscriptionPlansQuery,
  useGetDocumentFundingRequestsQuery,
} = subscriptionsApi;
