import { baseApi } from "../api/baseApi";
import { hydrate, reportsPayload } from "../admin/mockData";
import type { IncidentReport } from "../admin/types";

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReports: builder.query<IncidentReport[], void>({
      queryFn: () => hydrate(reportsPayload),
      providesTags: ["Reports"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetReportsQuery } = reportsApi;

