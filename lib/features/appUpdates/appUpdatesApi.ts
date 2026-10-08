import { baseApi } from "../api/baseApi";

export interface AppRelease {
  id: string;
  platform: "ios" | "android";
  version: string;
  build: string;
  notes: string;
  available: boolean;
  publishedAt: string;
}
export type ReleaseInput = Pick<AppRelease, "platform" | "version" | "build" | "notes"> & {
  storeAvailabilityConfirmed: true;
};
const api = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAppReleases: builder.query<AppRelease[], void>({
      query: () => "/app-updates/releases",
      providesTags: ["AppUpdates"],
    }),
    publishAppRelease: builder.mutation<AppRelease, ReleaseInput>({
      query: (body) => ({ url: "/app-updates/releases", method: "POST", body }),
      invalidatesTags: ["AppUpdates"],
    }),
    withdrawAppRelease: builder.mutation<{ withdrawn: boolean }, string>({
      query: (id) => ({ url: `/app-updates/releases/${encodeURIComponent(id)}/withdraw`, method: "POST" }),
      invalidatesTags: ["AppUpdates"],
    }),
  }),
});
export const { useGetAppReleasesQuery, usePublishAppReleaseMutation, useWithdrawAppReleaseMutation } = api;
