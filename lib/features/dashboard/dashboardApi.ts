import { baseApi } from "../api/baseApi";
import { dashboardPayload, hydrate } from "../admin/mockData";
import type { DashboardResponse } from "../admin/types";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardResponse, void>({
      queryFn: () => hydrate(dashboardPayload),
      providesTags: ["Dashboard"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetDashboardQuery } = dashboardApi;

