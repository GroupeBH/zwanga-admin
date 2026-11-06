import { baseApi } from "../api/baseApi";
import {
  buildPaymentOverview,
  buildRouteInsights,
  buildTripLifecycleBuckets,
  buildTripTimeline,
  getTripLifecycleStatus,
} from "../admin/insights";
import type {
  DashboardResponse,
  DocumentFundingRequest,
  DriverHighlight,
  KycDocument,
  MetricCard,
  PlatformUserStats,
  SubscriptionOffering,
  Trip,
  TripLifecycleStatus,
} from "../admin/types";

const toArray = <T>(payload: unknown, nestedKey?: string): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object" && nestedKey) {
    const nested = (payload as Record<string, unknown>)[nestedKey];
    if (Array.isArray(nested)) {
      return nested as T[];
    }
  }

  return [];
};

const toKycDocuments = (payload: unknown): KycDocument[] =>
  toArray<KycDocument>(payload, "documents");

/* Les listes paginees du backend exposent leur total soit a la racine
   (signalements) soit sous `meta` (support). */
const readTotal = (payload: unknown): number | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.total === "number") {
    return record.total;
  }

  const meta = record.meta;
  if (meta && typeof meta === "object") {
    const metaTotal = (meta as Record<string, unknown>).total;
    if (typeof metaTotal === "number") {
      return metaTotal;
    }
  }

  return null;
};

const TRIP_SAMPLE_SIZE = 1000;

const formatInteger = (value: number) =>
  new Intl.NumberFormat("fr-CD").format(Number.isFinite(value) ? value : 0);
const formatCounter = (value: number | null) =>
  value === null ? "Indisponible" : formatInteger(value);

const formatAmount = (amount: number, currency: string) => {
  const rounded = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${formatInteger(rounded)} ${currency}`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Bonjour";
  }
  if (hour < 18) {
    return "Bon après-midi";
  }
  return "Bonsoir";
};

const summarizeLifecycle = (trips: Trip[]) => {
  const counters: Record<TripLifecycleStatus, number> = {
    upcoming: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0,
    expired: 0,
  };

  for (const trip of trips) {
    counters[getTripLifecycleStatus(trip)] += 1;
  }

  return counters;
};

/** Volumes de moderation, comptes par le serveur et non par la page. */
interface ModerationCounts {
  pendingKyc: number | null;
  pendingReports: number | null;
  openSupportTickets: number | null;
}

interface TripSample {
  loaded: number;
  total: number | null;
}

const sampleHelper = (sample: TripSample) =>
  sample.total !== null && sample.total > sample.loaded
    ? ` · sur les ${formatInteger(sample.loaded)} plus récents`
    : "";

const buildMetricCards = (
  userStats: PlatformUserStats,
  trips: Trip[],
  kycDocuments: KycDocument[],
  fundingRequests: DocumentFundingRequest[],
  planCurrencies: string[],
  moderation: ModerationCounts,
  sample: TripSample
): MetricCard[] => {
  const lifecycle = summarizeLifecycle(trips);
  const pendingKyc = moderation.pendingKyc;
  const partial = sampleHelper(sample);
  const paymentOverview = buildPaymentOverview([], fundingRequests);
  const pendingFundingCurrency = planCurrencies[0] ?? "CDF";

  return [
    {
      id: "users",
      label: "Utilisateurs",
      value: formatInteger(userStats.totalUsers),
      helper: "hors comptes administrateurs",
      tone: "neutral",
    },
    {
      id: "drivers",
      label: "Chauffeurs",
      value: formatInteger(userStats.drivers),
      helper: "KYC validé, véhicule actif et profil conducteur",
      tone: "neutral",
    },
    {
      id: "passengers",
      label: "Passagers",
      value: formatInteger(userStats.passengers),
      helper: "sans KYC validé et véhicule actif",
      tone: "neutral",
    },
    {
      id: "published",
      label: "Trajets publiés",
      value: formatInteger(sample.total ?? trips.length),
      helper: `${formatInteger(lifecycle.ongoing + lifecycle.upcoming)} encore ouverts${partial}`,
      tone: "neutral",
    },
    {
      id: "ongoing",
      label: "En cours",
      value: formatInteger(lifecycle.ongoing),
      helper: `trajets actuellement actifs${partial}`,
      tone: lifecycle.ongoing > 0 ? "success" : "neutral",
    },
    {
      id: "upcoming",
      label: "À venir",
      value: formatInteger(lifecycle.upcoming),
      helper: `publications programmées${partial}`,
      tone: lifecycle.upcoming > 0 ? "neutral" : "success",
    },
    {
      id: "expired",
      label: "Expirés",
      value: formatInteger(lifecycle.expired),
      helper: `départ dépassé de plus de 2 h${partial}`,
      tone: lifecycle.expired > 0 ? "warning" : "success",
    },
    {
      id: "kyc",
      label: "KYC en attente",
      value: formatCounter(pendingKyc),
      helper:
        pendingKyc === null
          ? "compteur indisponible"
          : pendingKyc > 0
            ? "validation admin requise"
            : "aucun dossier bloqué",
      tone: pendingKyc === null ? "neutral" : pendingKyc > 0 ? "warning" : "success",
    },
    {
      id: "funding",
      label: "Financement en attente",
      value: formatInteger(paymentOverview.pendingFundingRequests),
      helper:
        paymentOverview.pendingFundingRequests > 0
          ? `${formatAmount(paymentOverview.pendingAmount, pendingFundingCurrency)} à valider`
          : "aucune demande ouverte",
      tone: paymentOverview.pendingFundingRequests > 0 ? "warning" : "success",
    },
    {
      id: "reports",
      label: "Signalements à traiter",
      value: formatCounter(moderation.pendingReports),
      helper:
        moderation.pendingReports === null
          ? "compteur indisponible"
          : moderation.pendingReports > 0
            ? "personne ne s'en occupe encore"
            : "aucun signalement en attente",
      tone:
        moderation.pendingReports === null
          ? "neutral"
          : moderation.pendingReports > 0
            ? "danger"
            : "success",
    },
    {
      id: "support",
      label: "Tickets support ouverts",
      value: formatCounter(moderation.openSupportTickets),
      helper:
        moderation.openSupportTickets === null
          ? "compteur indisponible"
          : moderation.openSupportTickets > 0
            ? "demandes sans prise en charge"
            : "aucune demande ouverte",
      tone:
        moderation.openSupportTickets === null
          ? "neutral"
          : moderation.openSupportTickets > 0
            ? "warning"
            : "success",
    },
  ];
};

const buildAlerts = (
  trips: Trip[],
  kycDocuments: KycDocument[],
  fundingRequests: DocumentFundingRequest[],
  moderation: ModerationCounts
) => {
  const lifecycle = summarizeLifecycle(trips);
  const pendingKyc = moderation.pendingKyc ?? 0;
  const pendingFunding = fundingRequests.filter((item) => item.status === "pending");
  const rejectedFunding = fundingRequests.filter((item) => item.status === "rejected");

  const alerts = [];

  if (pendingKyc > 0) {
    alerts.push({
      id: "alert-kyc",
      type: "kyc" as const,
      message: `${pendingKyc} dossier(s) KYC attendent une vérification`,
      severity: pendingKyc >= 5 ? ("high" as const) : ("medium" as const),
      timestamp:
        kycDocuments
          .filter((item) => item.status === "pending")
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )[0]?.createdAt ?? new Date().toISOString(),
    });
  }

  const pendingReports = moderation.pendingReports ?? 0;
  if (pendingReports > 0) {
    alerts.push({
      id: "alert-reports",
      type: "safety" as const,
      message: `${pendingReports} signalement(s) attendent une décision`,
      severity: pendingReports >= 3 ? ("high" as const) : ("medium" as const),
      timestamp: new Date().toISOString(),
    });
  }

  const openTickets = moderation.openSupportTickets ?? 0;
  if (openTickets > 0) {
    alerts.push({
      id: "alert-support",
      type: "support" as const,
      message: `${openTickets} ticket(s) support sans prise en charge`,
      severity:
        openTickets >= 5
          ? ("medium" as const)
          : ("low" as const),
      timestamp: new Date().toISOString(),
    });
  }

  if (lifecycle.expired > 0) {
    alerts.push({
      id: "alert-expired-trips",
      type: "safety" as const,
      message: `${lifecycle.expired} trajet(s) publiés sont maintenant expirés`,
      severity: lifecycle.expired >= 3 ? ("high" as const) : ("medium" as const),
      timestamp: new Date().toISOString(),
    });
  }

  if (pendingFunding.length > 0) {
    alerts.push({
      id: "alert-funding",
      type: "payment" as const,
      message: `${pendingFunding.length} demande(s) de financement à traiter`,
      severity: pendingFunding.length >= 3 ? ("medium" as const) : ("low" as const),
      timestamp: pendingFunding[0]?.createdAt ?? new Date().toISOString(),
    });
  }

  if (rejectedFunding.length > 0) {
    alerts.push({
      id: "alert-funding-rejected",
      type: "subscription" as const,
      message: `${rejectedFunding.length} demande(s) de financement ont été rejetées`,
      severity: "low" as const,
      timestamp: rejectedFunding[0]?.updatedAt ?? new Date().toISOString(),
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "alert-stable",
      type: "support" as const,
      message: "Aucune alerte critique en cours",
      severity: "low" as const,
      timestamp: new Date().toISOString(),
    });
  }

  return alerts.slice(0, 4);
};

const buildTopDrivers = (trips: Trip[]): DriverHighlight[] => {
  const drivers = new Map<string, DriverHighlight>();

  for (const trip of trips) {
    if (!trip.driver || getTripLifecycleStatus(trip) !== "completed") {
      continue;
    }

    const driverId = trip.driver.id;
    const existing = drivers.get(driverId) ?? {
      id: driverId,
      name: `${trip.driver.firstName} ${trip.driver.lastName}`,
      score: 0,
      completed: 0,
    };

    existing.completed += 1;
    existing.score = existing.completed * 10 + Math.max(0, trip.availableSeats);
    drivers.set(driverId, existing);
  }

  return Array.from(drivers.values())
    .sort((a, b) => {
      if (b.completed !== a.completed) {
        return b.completed - a.completed;
      }
      return b.score - a.score;
    })
    .slice(0, 5);
};

const calculateDashboardMetrics = (
  userStats: PlatformUserStats,
  trips: Trip[],
  kycDocuments: KycDocument[],
  subscriptionPlans: SubscriptionOffering[],
  fundingRequests: DocumentFundingRequest[],
  moderation: ModerationCounts,
  sample: TripSample
): DashboardResponse => {
  const lifecycleBuckets = buildTripLifecycleBuckets(trips);
  const planCurrencies = subscriptionPlans.map((item) => item.documentFundingCurrency);
  const paymentOverview = buildPaymentOverview(subscriptionPlans, fundingRequests);

  const dateLabel = new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return {
    greeting: `${getGreeting()}, pilotage admin Zwanga`,
    dateRange: `Mis à jour le ${dateLabel}`,
    metrics: buildMetricCards(
      userStats,
      trips,
      kycDocuments,
      fundingRequests,
      planCurrencies,
      moderation,
      sample
    ),
    tripTrends: buildTripTimeline(trips),
    tripLifecycle: lifecycleBuckets,
    subscriptionPlans,
    paymentOverview,
    alerts: buildAlerts(trips, kycDocuments, fundingRequests, moderation),
    popularRoutes: buildRouteInsights(trips),
    topDrivers: buildTopDrivers(trips),
    recentFundingRequests: [...fundingRequests]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5),
    kycQueueShortlist: [...kycDocuments]
      .filter((item) => item.status === "pending")
      .sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      .slice(0, 5),
    queues: {
      pendingKyc: moderation.pendingKyc,
      pendingReports: moderation.pendingReports,
      openSupportTickets: moderation.openSupportTickets,
    },
    tripSample: sample,
  };
};

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardResponse, void>({
      async queryFn(_arg, _queryApi, _extraOptions, fetchWithBQ) {
        try {
          const [
            userStatsResult,
            tripsResult,
            kycHistoryResult,
            plansResult,
            fundingResult,
            pendingReportsResult,
            openTicketsResult,
          ] = await Promise.all([
            fetchWithBQ("/admin/users/stats"),
            fetchWithBQ({
              url: "/admin/trips",
              params: { page: 1, limit: TRIP_SAMPLE_SIZE },
            }),
            fetchWithBQ({
              url: "/admin/kyc",
              params: { status: "pending", page: 1, limit: 50 },
            }),
            fetchWithBQ("/subscriptions/plans"),
            fetchWithBQ("/subscriptions/document-funding-requests"),
            /* Une seule ligne est demandee: seul le total compte pour la
               vignette, pas le detail des dossiers. */
            fetchWithBQ({
              url: "/safety/admin/reports",
              params: { status: "pending", page: 1, limit: 1 },
            }),
            fetchWithBQ({
              url: "/support/admin/tickets",
              params: { status: "open", page: 1, limit: 1 },
            }),
          ]);

          if (userStatsResult.error) {
            return { error: userStatsResult.error as any };
          }
          if (tripsResult.error) {
            return { error: tripsResult.error as any };
          }

          let kycDocuments = toKycDocuments(kycHistoryResult.data);
          // La liste est limitee a 50 dossiers: seul le total serveur est exact.
          let pendingKyc: number | null = kycHistoryResult.error
            ? null
            : readTotal(kycHistoryResult.data) ??
              kycDocuments.filter((item) => item.status === "pending").length;
          if (kycHistoryResult.error) {
            const pendingResult = await fetchWithBQ("/admin/kyc/pending");
            kycDocuments = pendingResult.error
              ? []
              : toKycDocuments(pendingResult.data);
            pendingKyc = pendingResult.error
              ? null
              : readTotal(pendingResult.data) ?? kycDocuments.length;
          }

          const userStats = userStatsResult.data as PlatformUserStats;
          const trips = toArray<Trip>(tripsResult.data, "trips");
          const subscriptionPlans = toArray<SubscriptionOffering>(plansResult.data);
          const fundingRequests = toArray<DocumentFundingRequest>(
            fundingResult.data
          );

          /* Ces comptes sont secondaires: une erreur ne doit pas priver
             l'admin de tout le tableau de bord, ni s'afficher comme
             « rien a traiter ». */
          const moderation: ModerationCounts = {
            pendingKyc,
            pendingReports: pendingReportsResult.error
              ? null
              : readTotal(pendingReportsResult.data),
            openSupportTickets: openTicketsResult.error
              ? null
              : readTotal(openTicketsResult.data),
          };
          const sample: TripSample = {
            loaded: trips.length,
            total: readTotal(tripsResult.data),
          };

          const dashboard = calculateDashboardMetrics(
            userStats,
            trips,
            kycDocuments,
            subscriptionPlans,
            fundingRequests,
            moderation,
            sample
          );

          return { data: dashboard };
        } catch (error: any) {
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        }
      },
      providesTags: ["Dashboard"],
    }),
    getMarketingStats: builder.query<
      { users: number; trips: number; subscriptions: number; tripRequests: number },
      void
    >({
      query: () => "/admin/stats",
      providesTags: ["Dashboard"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetDashboardQuery, useGetMarketingStatsQuery } = dashboardApi;
