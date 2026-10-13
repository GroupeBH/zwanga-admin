import { baseApi } from "../api/baseApi";
import type {
  DocumentFundingRequest,
  DocumentFundingRequestStatus,
  SubscriptionOffering,
  SubscriptionPlanCode,
  SubscriptionStatus,
} from "../admin/types";
import { listProvidesTags, unwrapList } from "@/lib/utils/toList";

export interface DocumentFundingRequestsQueryParams {
  status?: DocumentFundingRequestStatus | "all";
}

export interface ActiveProSubscription {
  id: string;
  userId: string;
  plan: SubscriptionPlanCode;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  amount: number;
  currency: string;
  isTrial: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  } | null;
}

export interface ActiveProSubscriptionsQuery {
  page?: number;
  limit?: number;
  search?: string;
  month?: "current" | "other";
}

export const subscriptionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubscriptionPlans: builder.query<SubscriptionOffering[], void>({
      query: () => "/subscriptions/plans",
      transformResponse: (response: unknown) =>
        unwrapList<SubscriptionOffering>(response, "plans"),
      providesTags: ["Subscriptions"],
    }),

    getActiveProSubscriptions: builder.query<
      { subscriptions: ActiveProSubscription[]; total: number; page: number; limit: number },
      ActiveProSubscriptionsQuery | void
    >({
      query: ({ page = 1, limit = 25, search, month } = {}) => ({
        url: "/subscriptions/admin/active",
        params: {
          page,
          limit,
          ...(search ? { search } : {}),
          ...(month ? { month } : {}),
        },
      }),
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
  useGetActiveProSubscriptionsQuery,
  useGetDocumentFundingRequestsQuery,
} = subscriptionsApi;
