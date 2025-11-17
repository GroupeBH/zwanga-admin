import { baseApi } from "../api/baseApi";
import { hydrate, subscriptionsPayload } from "../admin/mockData";
import type { SubscriptionPlan } from "../admin/types";

export const subscriptionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubscriptions: builder.query<SubscriptionPlan[], void>({
      queryFn: () => hydrate(subscriptionsPayload),
      providesTags: ["Subscriptions"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetSubscriptionsQuery } = subscriptionsApi;

