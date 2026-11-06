import { baseApi } from "../api/baseApi";

export type MobilePlatform = "android" | "ios";
export type MobileEnvironment = "production" | "staging" | "development";
export type MobileParams = Record<string, string | number | undefined>;
export interface MobilePage<T> {
  items: T[];
  page: number;
  limit: number;
  hasMore?: boolean;
}
export interface MobileInstallation {
  id: string;
  platform: MobilePlatform;
  version: string;
  build: string;
  enabled: boolean;
  linked: boolean;
  createdAt: string;
  updatedAt: string;
  firstLinkedAt: string | null;
  mobileMetadata: {
    environment?: string;
    notificationPermission?: string;
    osVersion?: string;
    deviceCategory?: string;
  };
}
export interface MobileRelease {
  id: string;
  platform: MobilePlatform;
  version: string;
  build: string;
  available: boolean;
  publishedAt: string;
  notes: string;
}
export type PolicyMode = "NONE" | "OPTIONAL" | "RECOMMENDED" | "REQUIRED";
export interface PolicyInput {
  id: string;
  platform: MobilePlatform;
  environment: MobileEnvironment;
  releaseId: string;
  mode: PolicyMode;
  minimumBuild: string;
  minimumVersion?: string;
  message: string;
  storeUrl: string;
  audience: "all" | "anonymous" | "linked";
  blockedFeatures: string[];
  effectiveAt: string;
  expiresAt?: string;
  availabilityConfirmed: boolean;
  availabilityEvidence: string;
  revision?: number;
}
export interface MobilePolicy extends Omit<PolicyInput, "expiresAt"> {
  expiresAt: string | null;
  revision: number;
  active: boolean;
  updatedAt: string;
}
export interface CampaignInput {
  id: string;
  title: string;
  body: string;
  kind:
    | "information"
    | "signup"
    | "feature"
    | "update"
    | "maintenance"
    | "operational"
    | "marketing";
  audience: {
    platform?: MobilePlatform;
    environment: MobileEnvironment;
    population: "all" | "anonymous" | "linked" | "driver" | "passenger";
    belowBuild?: string;
    inactiveDays?: number;
  };
  expiresAt: string;
  revision?: number;
}
export interface MobileCampaign extends CampaignInput {
  state: string;
  revision: number;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  scheduledAt: string | null;
}
export interface CampaignStats {
  queued: number;
  providerAccepted: number;
  failed: number;
  suppressed: number;
  permanentFailures: number;
  invalidTokens: number;
  instrumentedOpens: number;
  deliveredToDevice: null;
  seenByHuman: null;
}
export interface MobileAlert {
  id: string;
  severity: string;
  message: string;
  createdAt: string;
  resolvedAt: string | null;
  resolution: string | null;
}
export interface MobileAudit {
  id: string;
  action: string;
  actorId: string | null;
  subjectId: string | null;
  createdAt: string;
  details: unknown;
}
interface Metric<T> {
  value: T;
  definition: string;
  source: string;
  synchronizedAt: string;
  unit: string;
}
export interface MobileOverview {
  generatedAt: string;
  from: string;
  to: string;
  installations: Metric<{
    installations: number;
    anonymous: number;
    linked: number;
    reachable: number;
    activeLast30Days: number;
    firstLinksInPeriod: number;
  }>;
  adoption: Metric<
    {
      platform: string;
      version: string;
      build: string;
      installations: number;
    }[]
  >;
  activity: Metric<{ day: string; platform: string; installations: number }[]>;
  retention: Metric<{ days: number; eligible: number; retained: number }[]>;
  obsoleteBuilds: Metric<number>;
  accounts: Metric<{
    registrations: number;
    firstTripCompletedAsOfNow: number;
    activeDrivers: number;
    activePassengers: number;
  }>;
  conversions: {
    installationToAccountLinkPercent: number | null;
    accountToFirstTripPercent: number | null;
  };
}
const prefix = "/admin/mobile-operations";
const idPath = (resource: string, id: string) =>
  `${prefix}/${resource}/${encodeURIComponent(id)}`;
export const mobileOperationsApi = baseApi
  .enhanceEndpoints({ addTagTypes: ["MobileOperations"] })
  .injectEndpoints({
    endpoints: (b) => ({
      getMobileOverview: b.query<MobileOverview, MobileParams>({
        query: (params) => ({ url: `${prefix}/overview`, params }),
        providesTags: ["MobileOperations"],
      }),
      getMobileInstallations: b.query<
        MobilePage<MobileInstallation>,
        MobileParams
      >({
        query: (params) => ({ url: `${prefix}/installations`, params }),
        providesTags: ["MobileOperations"],
      }),
      getMobileInstallationHistory: b.query<
        MobilePage<{ day: string; platform: string; version: string }>,
        { id: string; page: number }
      >({
        query: ({ id, page }) => ({
          url: idPath("installations", id) + "/history",
          params: { page, limit: 25 },
        }),
      }),
      getMobileReleases: b.query<MobilePage<MobileRelease>, MobileParams>({
        query: (params) => ({ url: `${prefix}/releases`, params }),
        providesTags: ["MobileOperations", "AppUpdates"],
      }),
      getMobilePolicies: b.query<MobilePage<MobilePolicy>, MobileParams>({
        query: (params) => ({ url: `${prefix}/policies`, params }),
        providesTags: ["MobileOperations"],
      }),
      saveMobilePolicy: b.mutation<MobilePolicy, PolicyInput>({
        query: (body) => ({
          url:
            body.revision === undefined
              ? `${prefix}/policies`
              : idPath("policies", body.id),
          method: body.revision === undefined ? "POST" : "PUT",
          body,
        }),
        invalidatesTags: ["MobileOperations"],
      }),
      toggleMobilePolicy: b.mutation<
        MobilePolicy,
        { id: string; revision: number; active: boolean; confirmed: true }
      >({
        query: ({ id, active, ...body }) => ({
          url: idPath("policies", id) + (active ? "/activate" : "/deactivate"),
          method: "POST",
          body,
        }),
        invalidatesTags: ["MobileOperations"],
      }),
      getMobileCampaigns: b.query<MobilePage<MobileCampaign>, MobileParams>({
        query: (params) => ({ url: `${prefix}/campaigns`, params }),
        providesTags: ["MobileOperations"],
      }),
      saveMobileCampaign: b.mutation<MobileCampaign, CampaignInput>({
        query: (body) => ({
          url:
            body.revision === undefined
              ? `${prefix}/campaigns`
              : idPath("campaigns", body.id),
          method: body.revision === undefined ? "POST" : "PUT",
          body,
        }),
        invalidatesTags: ["MobileOperations"],
      }),
      getMobileCampaignPreview: b.query<
        {
          campaign: MobileCampaign;
          eligibleInstallations: number;
          estimateOnly: true;
        },
        string
      >({
        query: (id) => idPath("campaigns", id) + "/preview",
        providesTags: ["MobileOperations"],
      }),
      getMobileCampaignStats: b.query<CampaignStats, string>({
        query: (id) => idPath("campaigns", id) + "/stats",
        providesTags: ["MobileOperations"],
      }),
      actOnMobileCampaign: b.mutation<
        MobileCampaign,
        {
          id: string;
          action: "approve" | "launch" | "cancel";
          revision: number;
          confirmed: true;
          scheduledAt?: string;
        }
      >({
        query: ({ id, action, ...body }) => ({
          url: idPath("campaigns", id) + "/" + action,
          method: "POST",
          body,
        }),
        invalidatesTags: ["MobileOperations"],
      }),
      getMobileAlerts: b.query<MobilePage<MobileAlert>, MobileParams>({
        query: (params) => ({ url: `${prefix}/alerts`, params }),
        providesTags: ["MobileOperations"],
      }),
      resolveMobileAlert: b.mutation<
        { resolved: true },
        { id: string; resolution: string }
      >({
        query: ({ id, ...body }) => ({
          url: idPath("alerts", id) + "/resolve",
          method: "POST",
          body,
        }),
        invalidatesTags: ["MobileOperations", "StoreManagement"],
      }),
      getMobileAudit: b.query<MobilePage<MobileAudit>, MobileParams>({
        query: (params) => ({ url: `${prefix}/audit-logs`, params }),
        providesTags: ["MobileOperations"],
      }),
    }),
    overrideExisting: false,
  });
export const {
  useGetMobileOverviewQuery,
  useGetMobileInstallationsQuery,
  useGetMobileInstallationHistoryQuery,
  useGetMobileReleasesQuery,
  useGetMobilePoliciesQuery,
  useSaveMobilePolicyMutation,
  useToggleMobilePolicyMutation,
  useGetMobileCampaignsQuery,
  useSaveMobileCampaignMutation,
  useGetMobileCampaignPreviewQuery,
  useGetMobileCampaignStatsQuery,
  useActOnMobileCampaignMutation,
  useGetMobileAlertsQuery,
  useResolveMobileAlertMutation,
  useGetMobileAuditQuery,
} = mobileOperationsApi;
