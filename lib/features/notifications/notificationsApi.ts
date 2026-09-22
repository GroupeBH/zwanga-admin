import { baseApi } from "../api/baseApi";

export type NotificationStatus = "sent" | "failed" | "pending";

/** Notification telle que persistee par le backend. */
export interface AdminNotification {
  id: string;
  userId: string | null;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isAutomatic: boolean;
  status: NotificationStatus;
  isRead: boolean;
  readAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  notifications: AdminNotification[];
  total: number;
  unreadCount: number;
}

/** `critical` ecarte le suivi courant des trajets et des demandes de trajet. */
export type NotificationScope = "all" | "critical";

export interface ListNotificationsQuery {
  limit?: number;
  offset?: number;
  scope?: NotificationScope;
}

/* Le backend renvoie un objet enveloppe, mais une version plus ancienne
   renvoyait un tableau nu: les deux formes sont acceptees pour eviter un
   ecran vide en cas de decalage de deploiement. */
const normalizeNotifications = (
  response: NotificationsResponse | AdminNotification[]
): NotificationsResponse => {
  if (Array.isArray(response)) {
    return {
      notifications: response,
      total: response.length,
      unreadCount: response.filter((item) => !item.isRead).length,
    };
  }

  const notifications = Array.isArray(response?.notifications)
    ? response.notifications
    : [];

  return {
    notifications,
    total: typeof response?.total === "number" ? response.total : notifications.length,
    unreadCount:
      typeof response?.unreadCount === "number"
        ? response.unreadCount
        : notifications.filter((item) => !item.isRead).length,
  };
};

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<
      NotificationsResponse,
      ListNotificationsQuery | void
    >({
      /* Le back-office ne montre que les notifications qui demandent une
         action: le suivi minute par minute des trajets reste sur le mobile. */
      query: (params) => ({
        url: "/notifications",
        params: { scope: "critical", ...(params ?? {}) },
      }),
      transformResponse: normalizeNotifications,
      providesTags: ["Notifications"],
    }),

    markNotificationsAsRead: builder.mutation<{ updated: number }, string[]>({
      query: (notificationIds) => ({
        url: "/notifications/mark-as-read",
        method: "PUT",
        body: { notificationIds },
      }),
      invalidatesTags: ["Notifications"],
    }),

    markAllNotificationsAsRead: builder.mutation<{ updated: number }, void>({
      query: () => ({
        url: "/notifications/mark-all-as-read",
        method: "PUT",
      }),
      invalidatesTags: ["Notifications"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationsAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} = notificationsApi;
