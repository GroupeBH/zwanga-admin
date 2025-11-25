import { baseApi } from "../api/baseApi";
import type { User, PaginatedUsersResponse } from "../admin/types";

export interface UsersQueryParams {
  page?: number;
  limit?: number;
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
  }),
  overrideExisting: false,
});

export const {
  useGetUsersQuery,
  useSuspendUserMutation,
  useActivateUserMutation,
} = usersApi;
