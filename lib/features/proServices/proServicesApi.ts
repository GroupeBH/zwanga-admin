import { baseApi } from "../api/baseApi";
import type { CaseRow, Offering, ServiceCase } from "./types";
export const proServicesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    proCatalogue: builder.query<Offering[], void>({
      query: () => "/pro-services/admin/catalogue",
      providesTags: ["ProServices"],
    }),
    proCases: builder.query<
      { items: CaseRow[]; nextCursor: string | null },
      { cursor?: string; status?: string }
    >({
      query: (params) => ({ url: "/pro-services/admin/cases", params }),
      providesTags: ["ProServices"],
    }),
    proCase: builder.query<ServiceCase, string>({
      query: (id) => `/pro-services/admin/cases/${encodeURIComponent(id)}`,
      providesTags: ["ProServices"],
    }),
    proCaseAction: builder.mutation<
      unknown,
      {
        id: string;
        action: "quote" | "status" | "owner" | "ledger" | `documents/${string}`;
        body: unknown;
      }
    >({
      query: ({ id, action, body }) => ({
        url: `/pro-services/admin/cases/${encodeURIComponent(id)}/${action}`,
        method: action === "status" ? "PUT" : "POST",
        body,
        timeout: 15000,
      }),
      invalidatesTags: ["ProServices"],
    }),
    configureProService: builder.mutation<
      unknown,
      { code: string; body: unknown }
    >({
      query: ({ code, body }) => ({
        url: `/pro-services/admin/catalogue/${encodeURIComponent(code)}`,
        method: "PUT",
        body,
        timeout: 15000,
      }),
      invalidatesTags: ["ProServices"],
    }),
  }),
});
export const {
  useProCatalogueQuery,
  useProCasesQuery,
  useProCaseQuery,
  useProCaseActionMutation,
  useConfigureProServiceMutation,
} = proServicesApi;
