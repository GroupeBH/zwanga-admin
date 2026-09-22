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
const readTotal = (payload: unknown): number => {
  if (!payload || typeof payload !== "object") {
    return 0;
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

  return 0;
};

const formatInteger = (value: number) =>
  new Intl.NumberFormat("fr-CD").format(Number.isFinite(value) ? value : 0);

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
    return "Bon apres-midi";
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
  pendingReports: number;
  openSupportTickets: number;
}

const buildMetricCards = (
  userStats: PlatformUserStats,
  trips: Trip[],
  kycDocuments: KycDocument[],
  fundingRequests: DocumentFundingRequest[],
  planCurrencies: string[],
  moderation: ModerationCounts
): MetricCard[] => {
  const lifecycle = summarizeLifecycle(trips);
  const pendingKyc = kycDocuments.filter((item) => item.status === "pending").length;
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
      label: "Trajets publies",
      value: formatInteger(trips.length),
      helper: `${formatInteger(lifecycle.ongoing + lifecycle.upcoming)} encore ouverts`,
      tone: "neutral",
    },
    {
      id: "ongoing",
      label: "En cours",
      value: formatInteger(lifecycle.ongoing),
      helper: "trajets actuellement actifs",
      tone: lifecycle.ongoing > 0 ? "success" : "neutral",
    },
    {
      id: "upcoming",
      label: "A venir",
      value: formatInteger(lifecycle.upcoming),
      helper: "publications programmees",
      tone: lifecycle.upcoming > 0 ? "neutral" : "success",
    },
    {
      id: "expired",
      label: "Expires",
      value: formatInteger(lifecycle.expired),
      helper: "depart depasse de plus de 2h",
      tone: lifecycle.expired > 0 ? "warning" : "success",
    },
    {
      id: "kyc",
      label: "KYC en attente",
      value: formatInteger(pendingKyc),
      helper: pendingKyc > 0 ? "validation admin requise" : "aucun dossier bloque",
      tone: pendingKyc > 0 ? "warning" : "success",
    },
    {
      id: "funding",
      label: "Financement en attente",
      value: formatInteger(paymentOverview.pendingFundingRequests),
      helper:
        paymentOverview.pendingFundingRequests > 0
          ? `${formatAmount(paymentOverview.pendingAmount, pendingFundingCurrency)} a valider`
          : "aucune demande ouverte",
      tone: paymentOverview.pendingFundingRequests > 0 ? "warning" : "success",
    },
    {
      id: "reports",
      label: "Signalements a traiter",
      value: formatInteger(moderation.pendingReports),
      helper:
        moderation.pendingReports > 0
          ? "personne ne s'en occupe encore"
          : "aucun signalement en attente",
      tone: moderation.pendingReports > 0 ? "danger" : "success",
    },
    {
      id: "support",
      label: "Tickets support ouverts",
      value: formatInteger(moderation.openSupportTickets),
      helper:
        moderation.openSupportTickets > 0
          ? "demandes sans prise en charge"
          : "aucune demande ouverte",
      tone: moderation.openSupportTickets > 0 ? "warning" : "success",
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
  const pendingKyc = kycDocuments.filter((item) => item.status === "pending").length;
  const pendingFunding = fundingRequests.filter((item) => item.status === "pending");
  const rejectedFunding = fundingRequests.filter((item) => item.status === "rejected");

  const alerts = [];

  if (pendingKyc > 0) {
    alerts.push({
      id: "alert-kyc",
      type: "kyc" as const,
      message: `${pendingKyc} dossier(s) KYC attendent une verification`,
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

  if (moderation.pendingReports > 0) {
    alerts.push({
      id: "alert-reports",
      type: "safety" as const,
      message: `${moderation.pendingReports} signalement(s) attendent une decision`,
      severity:
        moderation.pendingReports >= 3 ? ("high" as const) : ("medium" as const),
      timestamp: new Date().toISOString(),
    });
  }

  if (moderation.openSupportTickets > 0) {
    alerts.push({
      id: "alert-support",
      type: "support" as const,
      message: `${moderation.openSupportTickets} ticket(s) support sans prise en charge`,
      severity:
        moderation.openSupportTickets >= 5
          ? ("medium" as const)
          : ("low" as const),
      timestamp: new Date().toISOString(),
    });
  }

  if (lifecycle.expired > 0) {
    alerts.push({
      id: "alert-expired-trips",
      type: "safety" as const,
      message: `${lifecycle.expired} trajet(s) publies sont maintenant expires`,
      severity: lifecycle.expired >= 3 ? ("high" as const) : ("medium" as const),
      timestamp: new Date().toISOString(),
    });
  }

  if (pendingFunding.length > 0) {
    alerts.push({
      id: "alert-funding",
      type: "payment" as const,
      message: `${pendingFunding.length} demande(s) de financement a traiter`,
      severity: pendingFunding.length >= 3 ? ("medium" as const) : ("low" as const),
      timestamp: pendingFunding[0]?.createdAt ?? new Date().toISOString(),
    });
  }

  if (rejectedFunding.length > 0) {
    alerts.push({
      id: "alert-funding-rejected",
      type: "subscription" as const,
      message: `${rejectedFunding.length} demande(s) de financement ont ete rejetees`,
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
      rating: 4.6,
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
  moderation: ModerationCounts
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
    dateRange: `Mis a jour le ${dateLabel}`,
    metrics: buildMetricCards(
      userStats,
      trips,
      kycDocuments,
      fundingRequests,
      planCurrencies,
      moderation
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
            fetchWithBQ({ url: "/admin/trips", params: { page: 1, limit: 1000 } }),
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
          if (kycHistoryResult.error) {
            const pendingResult = await fetchWithBQ("/admin/kyc/pending");
            kycDocuments = pendingResult.error
              ? []
              : toKycDocuments(pendingResult.data);
          }

          const userStats = userStatsResult.data as PlatformUserStats;
          const trips = toArray<Trip>(tripsResult.data, "trips");
          const subscriptionPlans = toArray<SubscriptionOffering>(plansResult.data);
          const fundingRequests = toArray<DocumentFundingRequest>(
            fundingResult.data
          );

          /* Ces deux comptes sont secondaires: une erreur ne doit pas priver
             l'admin de tout le tableau de bord. */
          const moderation: ModerationCounts = {
            pendingReports: pendingReportsResult.error
              ? 0
              : readTotal(pendingReportsResult.data),
            openSupportTickets: openTicketsResult.error
              ? 0
              : readTotal(openTicketsResult.data),
          };

          const dashboard = calculateDashboardMetrics(
            userStats,
            trips,
            kycDocuments,
            subscriptionPlans,
            fundingRequests,
            moderation
          );

          return { data: dashboard };
        } catch (error: any) {
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        }
      },
      providesTags: ["Dashboard"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetDashboardQuery } = dashboardApi;
