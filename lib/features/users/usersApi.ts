import { baseApi } from "../api/baseApi";
import type {
  AdminAccount,
  AdminAccountsResponse,
  AdminUserDetailsResponse,
  PaginatedUsersResponse,
  User,
} from "../admin/types";

export interface UsersQueryParams {
  page?: number;
  limit?: number;
}

export interface CreateAdminAccountPayload {
  phone: string;
  firstName: string;
  lastName: string;
  defaultPassword: string;
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<User[], UsersQueryParams | void>({
      query: ({ page = 1, limit = 100 } = {}) => ({
        url: "/admin/users",
        params: { page, limit },
      }),
      transformResponse: (response: PaginatedUsersResponse) => response.users,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Users" as const, id })),
              { type: "Users" as const, id: "LIST" },
            ]
          : [{ type: "Users" as const, id: "LIST" }],
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
        result
          ? [
              ...result.accounts.map(({ id }) => ({ type: "Users" as const, id })),
              { type: "Users" as const, id: "ADMIN_ACCOUNTS" },
            ]
          : [{ type: "Users" as const, id: "ADMIN_ACCOUNTS" }],
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
  overrideExisting: false,
});

export const {
  useGetUsersQuery,
  useGetUserDetailsQuery,
  useGetAdminAccountsQuery,
  useCreateAdminAccountMutation,
  useSuspendUserMutation,
  useActivateUserMutation,
  useDeactivateUserMutation,
} = usersApi;
