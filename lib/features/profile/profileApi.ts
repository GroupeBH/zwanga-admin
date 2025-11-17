import { baseApi } from "../api/baseApi";
import { hydrate, profilePayload } from "../admin/mockData";
import type { AdminProfile } from "../admin/types";

export const profileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminProfile: builder.query<AdminProfile, void>({
      queryFn: () => hydrate(profilePayload),
      providesTags: ["AdminProfile"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetAdminProfileQuery } = profileApi;

