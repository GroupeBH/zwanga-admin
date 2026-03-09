import { baseApi } from "../api/baseApi";

export type SupportTicketStatus =
  | "open"
  | "in_progress"
  | "waiting_user"
  | "resolved"
  | "closed";

export type SupportTicketPriority = "low" | "medium" | "high" | "urgent";

export type SupportTicketCategory =
  | "general"
  | "account"
  | "payment"
  | "booking"
  | "safety"
  | "technical"
  | "other";

export type SupportUserRole = "passenger" | "driver" | "admin";

export interface SupportUser {
  id: string;
  firstName: string;
  lastName: string;
  role: SupportUserRole;
}

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  sender: SupportUser | null;
}

export interface SupportTicketSummary {
  id: string;
  userId: string;
  assignedAdminId: string | null;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  resolutionSummary: string | null;
  user: SupportUser | null;
  assignedAdmin: SupportUser | null;
}

export interface SupportTicketDetails extends SupportTicketSummary {
  messages: SupportTicketMessage[];
}

export interface PaginatedSupportTicketsResponse {
  data: SupportTicketSummary[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface SupportFaqEntry {
  id: string;
  question: string;
  answer: string;
  category?: string;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListSupportTicketsQuery {
  page?: number;
  limit?: number;
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  category?: SupportTicketCategory;
  search?: string;
}

export interface ListAdminSupportTicketsQuery extends ListSupportTicketsQuery {
  userId?: string;
  assignedAdminId?: string;
  unassignedOnly?: boolean;
}

export interface CreateSupportTicketPayload {
  subject: string;
  category?: SupportTicketCategory;
  priority?: SupportTicketPriority;
  message: string;
}

export interface AddSupportTicketMessagePayload {
  content: string;
  isInternal?: boolean;
}

export interface AssignSupportTicketPayload {
  adminId?: string;
}

export interface UpdateSupportTicketStatusPayload {
  status: SupportTicketStatus;
  resolutionSummary?: string;
  internalNote?: string;
}

export const supportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listFaq: builder.query<SupportFaqEntry[] | { data: SupportFaqEntry[] }, Record<string, unknown> | void>({
      query: (params) => (params ? { url: "/support/faq", params } : "/support/faq"),
      providesTags: ["Support"],
    }),

    getFaq: builder.query<SupportFaqEntry, string>({
      query: (id) => `/support/faq/${id}`,
      providesTags: ["Support"],
    }),

    createTicket: builder.mutation<SupportTicketDetails, CreateSupportTicketPayload>({
      query: (body) => ({
        url: "/support/tickets",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Support"],
    }),

    listMyTickets: builder.query<PaginatedSupportTicketsResponse, ListSupportTicketsQuery | void>({
      query: (params) => (params ? { url: "/support/tickets", params } : "/support/tickets"),
      providesTags: ["Support"],
    }),

    getMyTicket: builder.query<SupportTicketDetails, string>({
      query: (id) => `/support/tickets/${id}`,
      providesTags: ["Support"],
    }),

    addMyTicketMessage: builder.mutation<
      SupportTicketDetails,
      { ticketId: string; body: AddSupportTicketMessagePayload }
    >({
      query: ({ ticketId, body }) => ({
        url: `/support/tickets/${ticketId}/messages`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Support"],
    }),

    closeMyTicket: builder.mutation<SupportTicketDetails, string>({
      query: (ticketId) => ({
        url: `/support/tickets/${ticketId}/close`,
        method: "PATCH",
      }),
      invalidatesTags: ["Support"],
    }),

    reopenMyTicket: builder.mutation<SupportTicketDetails, string>({
      query: (ticketId) => ({
        url: `/support/tickets/${ticketId}/reopen`,
        method: "PATCH",
      }),
      invalidatesTags: ["Support"],
    }),

    listAdminTickets: builder.query<PaginatedSupportTicketsResponse, ListAdminSupportTicketsQuery | void>({
      query: (params) =>
        params ? { url: "/support/admin/tickets", params } : "/support/admin/tickets",
      providesTags: ["Support"],
    }),

    getAdminTicket: builder.query<SupportTicketDetails, string>({
      query: (ticketId) => `/support/admin/tickets/${ticketId}`,
      providesTags: ["Support"],
    }),

    addAdminTicketMessage: builder.mutation<
      SupportTicketDetails,
      { ticketId: string; body: AddSupportTicketMessagePayload }
    >({
      query: ({ ticketId, body }) => ({
        url: `/support/admin/tickets/${ticketId}/messages`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Support"],
    }),

    assignAdminTicket: builder.mutation<
      SupportTicketDetails,
      { ticketId: string; body: AssignSupportTicketPayload }
    >({
      query: ({ ticketId, body }) => ({
        url: `/support/admin/tickets/${ticketId}/assign`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Support"],
    }),

    updateAdminTicketStatus: builder.mutation<
      SupportTicketDetails,
      { ticketId: string; body: UpdateSupportTicketStatusPayload }
    >({
      query: ({ ticketId, body }) => ({
        url: `/support/admin/tickets/${ticketId}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Support"],
    }),

    // Compat layer for existing admin UI
    getSupportTickets: builder.query<SupportTicketSummary[], ListAdminSupportTicketsQuery | void>({
      query: (params) =>
        params ? { url: "/support/admin/tickets", params } : "/support/admin/tickets",
      transformResponse: (response: PaginatedSupportTicketsResponse) => response.data ?? [],
      providesTags: ["Support"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListFaqQuery,
  useGetFaqQuery,
  useCreateTicketMutation,
  useListMyTicketsQuery,
  useGetMyTicketQuery,
  useAddMyTicketMessageMutation,
  useCloseMyTicketMutation,
  useReopenMyTicketMutation,
  useListAdminTicketsQuery,
  useGetAdminTicketQuery,
  useAddAdminTicketMessageMutation,
  useAssignAdminTicketMutation,
  useUpdateAdminTicketStatusMutation,
  useGetSupportTicketsQuery,
} = supportApi;
