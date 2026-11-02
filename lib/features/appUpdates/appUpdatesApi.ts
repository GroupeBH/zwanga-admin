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
    previewUpdateCampaign: builder.query<{ eligibleInstallations: number }, string>({
      query: (id) => `/app-updates/campaigns/preview/${encodeURIComponent(id)}`,
      providesTags: ["AppUpdates"],
    }),
    getUpdateCampaigns: builder.query<{ id: string; title: string; active: boolean; queued: string; sent: string }[], void>({
      query: () => "/app-updates/campaigns", providesTags: ["AppUpdates"],
    }),
    createUpdateCampaign: builder.mutation<{ id: string; queued: boolean }, { id: string; releaseId: string; title: string; body: string }>({
      query: body => ({ url: "/app-updates/campaigns", method: "POST", body }), invalidatesTags: ["AppUpdates"],
    }),
    withdrawUpdateCampaign: builder.mutation<{ withdrawn: boolean }, string>({
      query: id => ({ url: `/app-updates/campaigns/${encodeURIComponent(id)}/withdraw`, method: "POST" }), invalidatesTags: ["AppUpdates"],
    }),
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
export const { useCreateUpdateCampaignMutation, useGetUpdateCampaignsQuery, usePreviewUpdateCampaignQuery, useWithdrawUpdateCampaignMutation } = api;
