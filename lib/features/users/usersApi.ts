import { baseApi } from "../api/baseApi";
import type {
  AdminAccount,
  AdminAccountsResponse,
  AdminUserDetailsResponse,
  PaginatedUsersResponse,
  User,
} from "../admin/types";
import { listProvidesTags, unwrapList } from "@/lib/utils/toList";

export type AdminUserRoleFilter =
  | "driver"
  | "passenger"
  | "verified_passenger";

export interface UsersQueryParams {
  page?: number;
  limit?: number;
  role?: AdminUserRoleFilter;
}

export interface CreateAdminAccountPayload {
  phone: string;
  firstName: string;
  lastName: string;
  defaultPassword: string;
}

export interface ResetAdminAccountPasswordPayload {
  userId: string;
  newPassword: string;
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<PaginatedUsersResponse, UsersQueryParams | void>({
      query: ({ page = 1, limit = 10, role } = {}) => ({
        url: "/admin/users",
        params: { page, limit, ...(role ? { role } : {}) },
      }),
      serializeQueryArgs: ({ queryArgs }) => {
        const args = queryArgs ?? {};
        return `users-${args.page ?? 1}-${args.limit ?? 10}-${args.role ?? "all"}`;
      },
      forceRefetch({ currentArg, previousArg }) {
        return (
          currentArg?.role !== previousArg?.role ||
          currentArg?.page !== previousArg?.page ||
          currentArg?.limit !== previousArg?.limit
        );
      },
      transformResponse: (response: unknown): PaginatedUsersResponse => {
        const users = unwrapList<User>(response, "users");
        const record =
          response && typeof response === "object" && !Array.isArray(response)
            ? (response as Record<string, unknown>)
            : {};
        return {
          users,
          total: typeof record.total === "number" ? record.total : users.length,
        };
      },
      providesTags: (result) => listProvidesTags("Users", result?.users),
    }),
    exportUsersXls: builder.mutation<Blob, Pick<UsersQueryParams, "role"> | void>({
      query: ({ role } = {}) => ({
        url: "/admin/users/export",
        params: role ? { role } : {},
        responseHandler: async (response) => {
          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as
              | { message?: string | string[] }
              | null;
            const message = Array.isArray(payload?.message)
              ? payload.message.join(", ")
              : payload?.message;
            throw new Error(message || "Impossible d'exporter les utilisateurs.");
          }
          return response.blob();
        },
      }),
    }),
    getUserDetails: builder.query<AdminUserDetailsResponse, string>({
      query: (userId) => `/admin/users/${userId}/details`,
      providesTags: (_result, _error, userId) => [
        { type: "Users", id: userId },
        { type: "Rides", id: "LIST" },
        { type: "Bookings", id: "LIST" },
        { type: "TripRequests", id: "LIST" },
        { type: "Payments", id: "LIST" },
      ],
    }),
    getAdminAccounts: builder.query<AdminAccountsResponse, UsersQueryParams | void>({
      query: ({ page = 1, limit = 25 } = {}) => ({
        url: "/admin/accounts",
        params: { page, limit },
      }),
      providesTags: (result) =>
        listProvidesTags("Users", result?.accounts, "ADMIN_ACCOUNTS"),
    }),
    createAdminAccount: builder.mutation<AdminAccount, CreateAdminAccountPayload>({
      query: (body) => ({
        url: "/admin/accounts",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Users", id: "ADMIN_ACCOUNTS" },
        { type: "Users", id: "LIST" },
      ],
    }),
    deactivateAdminAccount: builder.mutation<AdminAccount, string>({
      query: (userId) => ({
        url: `/admin/accounts/${userId}/deactivate`,
        method: "PUT",
      }),
      invalidatesTags: [
        { type: "Users", id: "ADMIN_ACCOUNTS" },
        { type: "Users", id: "LIST" },
        "Dashboard",
      ],
    }),
    activateAdminAccount: builder.mutation<AdminAccount, string>({
      query: (userId) => ({
        url: `/admin/accounts/${userId}/activate`,
        method: "PUT",
      }),
      invalidatesTags: [
        { type: "Users", id: "ADMIN_ACCOUNTS" },
        { type: "Users", id: "LIST" },
        "Dashboard",
      ],
    }),
    resetAdminAccountPassword: builder.mutation<
      AdminAccount,
      ResetAdminAccountPasswordPayload
    >({
      query: ({ userId, newPassword }) => ({
        url: `/admin/accounts/${userId}/password`,
        method: "PUT",
        body: { newPassword },
      }),
      invalidatesTags: [{ type: "Users", id: "ADMIN_ACCOUNTS" }],
    }),
    suspendUser: builder.mutation<User, string>({
      query: (userId) => ({
        url: `/admin/users/${userId}/suspend`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Users", id },
        { type: "Users", id: "LIST" },
        "Dashboard",
      ],
    }),
    activateUser: builder.mutation<User, string>({
      query: (userId) => ({
        url: `/admin/users/${userId}/activate`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Users", id },
        { type: "Users", id: "LIST" },
        "Dashboard",
      ],
    }),
    deactivateUser: builder.mutation<User, string>({
      query: (userId) => ({
        url: `/admin/users/${userId}/deactivate`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Users", id },
        { type: "Users", id: "LIST" },
        "Dashboard",
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetUsersQuery,
  useExportUsersXlsMutation,
  useGetUserDetailsQuery,
  useGetAdminAccountsQuery,
  useCreateAdminAccountMutation,
  useDeactivateAdminAccountMutation,
  useActivateAdminAccountMutation,
  useResetAdminAccountPasswordMutation,
  useSuspendUserMutation,
  useActivateUserMutation,
  useDeactivateUserMutation,
} = usersApi;
