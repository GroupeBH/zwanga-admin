import { baseApi } from "../api/baseApi";
import { hydrate, supportPayload } from "../admin/mockData";
import type { SupportTicket } from "../admin/types";

export const supportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSupportTickets: builder.query<SupportTicket[], void>({
      queryFn: () => hydrate(supportPayload),
      providesTags: ["Support"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetSupportTicketsQuery } = supportApi;

