import { baseApi } from "../api/baseApi";
import { hydrate, ridesPayload } from "../admin/mockData";
import type { RideRecord } from "../admin/types";

export const ridesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRides: builder.query<RideRecord[], void>({
      queryFn: () => hydrate(ridesPayload),
      providesTags: ["Rides"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetRidesQuery } = ridesApi;

