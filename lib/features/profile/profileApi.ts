import { baseApi } from "../api/baseApi";
import type { AdminProfile } from "../admin/types";

export const profileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentUserProfile: builder.query<AdminProfile, void>({
      query: () => "/users/me",
      providesTags: ["AdminProfile"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetCurrentUserProfileQuery } = profileApi;
