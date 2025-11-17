import { baseApi } from "../api/baseApi";
import { hydrate, notificationsPayload } from "../admin/mockData";
import type { NotificationItem } from "../admin/types";

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationItem[], void>({
      queryFn: () => hydrate(notificationsPayload),
      providesTags: ["Notifications"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetNotificationsQuery } = notificationsApi;

