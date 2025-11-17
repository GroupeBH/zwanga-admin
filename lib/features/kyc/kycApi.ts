import { baseApi } from "../api/baseApi";
import { hydrate, kycDocumentsPayload } from "../admin/mockData";
import type { KycDocument } from "../admin/types";

export const kycApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getKycDocuments: builder.query<KycDocument[], void>({
      queryFn: () => hydrate(kycDocumentsPayload),
      providesTags: ["KYC"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetKycDocumentsQuery } = kycApi;

