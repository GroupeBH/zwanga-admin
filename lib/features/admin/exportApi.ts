import { baseApi } from "../api/baseApi";
import { compactQueryParams } from "@/lib/utils/downloadBlob";

interface ExportAdminXlsArgs {
  url: string;
  params?: Record<string, string | number | undefined | null>;
}

export const adminExportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    exportAdminXls: builder.mutation<Blob, ExportAdminXlsArgs>({
      query: ({ url, params }) => ({
        url,
        params: compactQueryParams(params),
        responseHandler: async (response) => {
          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as
              | { message?: string | string[] }
              | null;
            const message = Array.isArray(payload?.message)
              ? payload.message.join(", ")
              : payload?.message;
            throw new Error(message || "Impossible d'exporter le fichier.");
          }
          return response.blob();
        },
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useExportAdminXlsMutation } = adminExportApi;
