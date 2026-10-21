import { baseApi } from "../api/baseApi";

export type StorePlatform = "google" | "apple";
export type StoreTask =
  "catalog" | "reviews" | "reports" | "vitals" | "connection";
export interface StoreStatus {
  enabled: boolean;
  scheduled: boolean;
  permissions: string[];
  platforms: {
    platform: StorePlatform;
    appId: string | null;
    configured: boolean;
    missingVariables: string[];
  }[];
}
export interface StoreRecord {
  id: string;
  platform: StorePlatform;
  kind: string;
  externalId: string;
  syncedAt: string;
  isCurrent: boolean;
  content: Record<string, unknown>;
}
export interface StoreWorkflow {
  recordId: string;
  revision: number;
  status: string;
  draft?: string | null;
  preparedBy?: string | null;
  approvedBy?: string | null;
  assigneeId?: string | null;
  publishedJobId?: string | null;
}
export interface StoreIntegration {
  platform: StorePlatform;
  appId: string;
  state: string;
  enabled: boolean;
  missingVariables: string[];
  checkedAt: string | null;
  lastSync: string | null;
  nextSchedulerCheck: string | null;
  schedule: Record<string, number>;
  capabilities: Record<
    string,
    { available: boolean; errorCode?: string }
  > | null;
}
export interface StoreJob {
  id: string;
  platform: StorePlatform;
  task: string;
  state: string;
  attempts: number;
  processed: number;
  errorCode: string | null;
  createdAt: string;
  completedAt: string | null;
}
export interface StoreMetric {
  id: string;
  platform: StorePlatform;
  date: string;
  metric: string;
  dimension: string;
  value: string;
  dataset: string;
  importedAt: string;
  definition: MetricDefinition;
}
export interface StoreDashboard {
  from: string;
  to: string;
  generatedAt: string;
  series: {
    platform: StorePlatform;
    date: string;
    metric: string;
    value: string;
  }[];
  cohorts: {
    date: string;
    registrations: number;
    drivers: number;
    passengers: number;
    kycSubmitted: number;
    kycApproved: number;
    firstTripCompleted: number;
  }[];
  reviewStats: {
    platform: StorePlatform;
    reviews: number;
    unanswered: number;
    sampleAverageRating: string;
  }[];
  freshness: {
    platform: StorePlatform;
    task: string;
    state: string;
    completedAt: string | null;
    errorCode: string | null;
  }[];
  notes: string[];
  business: { platforms: {platform:string;registrations:number}[]; accountsWithLatestLoginInPeriod:number; completedTrips:number };
  conversion: { kycApprovalPercent:number|null; firstTripPercent:number|null; downloadToRegistrationPercent:number|null };
}
export interface MetricDefinition {
  id: string;
  unit: string;
  aggregation: string;
  description: string;
  source: string;
  officialName: string;
  timezone: string;
}
export interface StoreAlert {
  id: string;
  platform: StorePlatform;
  code: string;
  severity: string;
  task: string;
}
interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
type Params = Record<string, string | number | undefined>;
const prefix = "/admin/stores";
export const storesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStoreStatus: builder.query<StoreStatus, void>({
      query: () => prefix + "/status",
      providesTags: ["StoreManagement"],
    }),
    getStoreDashboard: builder.query<StoreDashboard, Params>({
      query: (params) => ({ url: prefix + "/dashboard", params }),
      providesTags: ["StoreManagement"],
    }),
    getStoreRecords: builder.query<Page<StoreRecord>, Params>({
      query: (params) => ({ url: prefix + "/records", params }),
      providesTags: ["StoreManagement"],
    }),
    getStoreMetrics: builder.query<Page<StoreMetric>, Params>({
      query: (params) => ({ url: prefix + "/metrics", params }),
      providesTags: ["StoreManagement"],
    }),
    getStoreMetricCatalog: builder.query<MetricDefinition[], void>({
      query: () => prefix + "/metrics/catalog",
    }),
    getStoreJobs: builder.query<Page<StoreJob>, Params>({
      query: (params) => ({ url: prefix + "/syncs", params }),
      providesTags: ["StoreManagement"],
    }),
    getStoreAlerts: builder.query<{ items: StoreAlert[] }, void>({
      query: () => prefix + "/alerts",
      providesTags: ["StoreManagement"],
    }),
    syncStore: builder.mutation<
      StoreJob,
      {
        platform: StorePlatform;
        task: StoreTask;
        requestId: string;
        from: string;
        to: string;
      }
    >({
      query: ({ platform, ...body }) => ({
        url: prefix + "/" + platform + "/sync",
        method: "POST",
        body,
      }),
      invalidatesTags: ["StoreManagement"],
    }),
    retryStoreSync: builder.mutation<
      StoreJob,
      { id: string; requestId: string }
    >({
      query: ({ id, ...body }) => ({
        url: prefix + "/syncs/" + encodeURIComponent(id) + "/retry",
        method: "POST",
        body,
      }),
      invalidatesTags: ["StoreManagement"],
    }),
    replyStoreReview: builder.mutation<
      StoreJob,
      { id: string; revision: number; requestId: string }
    >({
      query: ({ id, ...body }) => ({
        url: prefix + "/reviews/" + encodeURIComponent(id) + "/reply",
        method: "POST",
        body,
      }),
      invalidatesTags: ["StoreManagement"],
    }),
    requestAppleAnalytics: builder.mutation<StoreJob, { requestId: string }>({
      query: (body) => ({
        url: prefix + "/apple/analytics-request",
        method: "POST",
        body,
      }),
      invalidatesTags: ["StoreManagement"],
    }),
    getStoreReview: builder.query<
      StoreRecord & { workflow: StoreWorkflow },
      string
    >({
      query: (id) => prefix + "/reviews/" + encodeURIComponent(id),
      providesTags: ["StoreManagement"],
    }),
    getStoreIntegrations: builder.query<StoreIntegration[], void>({
      query: () => prefix + "/integrations",
      providesTags: ["StoreManagement"],
    }),
    getStoreResource: builder.query<
      | {
          items: Record<string, unknown>[];
          total: number;
          profiles?: Record<string, string[]>;
        }
      | Record<string, unknown>[],
      {
        resource:
          | "audit-logs"
          | "alerts/events"
          | "alerts/rules"
          | "access"
          | `versions/${string}/incidents`;
        page?: number;
      }
    >({
      query: ({ resource, page }) => ({
        url: prefix + "/" + resource,
        params: { page: page ?? 1, limit: 25 },
      }),
      providesTags: ["StoreManagement"],
    }),
    storeAction: builder.mutation<
      unknown,
      { path: string; method?: "POST" | "PATCH" | "PUT"; body?: unknown }
    >({
      query: ({ path, method, body }) => ({
        url: prefix + "/" + path,
        method: method ?? "POST",
        body,
      }),
      invalidatesTags: ["StoreManagement"],
    }),
    exportStoreReport: builder.mutation<
      Blob,
      {
        topic: string;
        format: "csv" | "xls" | "pdf";
        from: string;
        to: string;
        platform?: StorePlatform;
      }
    >({
      query: (body) => ({
        url: prefix + "/reports/export",
        method: "POST",
        body,
        responseHandler: (response) =>
          response.ok ? response.blob() : response.json(),
      }),
    }),
  }),
  overrideExisting: false,
});
export const {
  useGetStoreStatusQuery,
  useGetStoreDashboardQuery,
  useGetStoreRecordsQuery,
  useGetStoreMetricsQuery,
  useGetStoreMetricCatalogQuery,
  useGetStoreJobsQuery,
  useGetStoreAlertsQuery,
  useSyncStoreMutation,
  useRetryStoreSyncMutation,
  useReplyStoreReviewMutation,
  useRequestAppleAnalyticsMutation,
  useGetStoreReviewQuery,
  useGetStoreIntegrationsQuery,
  useGetStoreResourceQuery,
  useStoreActionMutation,
  useExportStoreReportMutation,
} = storesApi;
