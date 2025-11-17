import { baseApi } from "../api/baseApi";
import { hydrate, usersPayload } from "../admin/mockData";
import type { UserRecord } from "../admin/types";

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<UserRecord[], void>({
      queryFn: () => hydrate(usersPayload),
      providesTags: ["Users"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetUsersQuery } = usersApi;

