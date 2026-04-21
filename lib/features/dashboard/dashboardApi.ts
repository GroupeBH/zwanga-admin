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
  SubscriptionOffering,
  Trip,
  TripLifecycleStatus,
  User,
} from "../admin/types";

const integerFormatter = new Intl.NumberFormat("fr-CD");

const formatInteger = (value: number) => integerFormatter.format(value);

const formatAmount = (amount: number, currency: string) => {
  const rounded = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${integerFormatter.format(rounded)} ${currency}`;
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

const buildMetricCards = (
  trips: Trip[],
  kycDocuments: KycDocument[],
  fundingRequests: DocumentFundingRequest[],
  planCurrencies: string[]
): MetricCard[] => {
  const lifecycle = summarizeLifecycle(trips);
  const pendingKyc = kycDocuments.filter((item) => item.status === "pending").length;
  const paymentOverview = buildPaymentOverview([], fundingRequests);
  const pendingFundingCurrency = planCurrencies[0] ?? "CDF";

  return [
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
  ];
};

const buildAlerts = (
  trips: Trip[],
  kycDocuments: KycDocument[],
  fundingRequests: DocumentFundingRequest[]
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
  users: User[],
  trips: Trip[],
  kycDocuments: KycDocument[],
  subscriptionPlans: SubscriptionOffering[],
  fundingRequests: DocumentFundingRequest[]
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
    metrics: buildMetricCards(trips, kycDocuments, fundingRequests, planCurrencies),
    tripTrends: buildTripTimeline(trips),
    tripLifecycle: lifecycleBuckets,
    subscriptionPlans,
    paymentOverview,
    alerts: buildAlerts(trips, kycDocuments, fundingRequests),
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
            usersResult,
            tripsResult,
            kycResult,
            plansResult,
            fundingResult,
          ] = await Promise.all([
            fetchWithBQ({ url: "/admin/users", params: { page: 1, limit: 1000 } }),
            fetchWithBQ({ url: "/admin/trips", params: { page: 1, limit: 1000 } }),
            fetchWithBQ("/admin/kyc/pending"),
            fetchWithBQ("/subscriptions/plans"),
            fetchWithBQ("/subscriptions/document-funding-requests"),
          ]);

          if (usersResult.error) {
            return { error: usersResult.error as any };
          }
          if (tripsResult.error) {
            return { error: tripsResult.error as any };
          }
          if (kycResult.error) {
            return { error: kycResult.error as any };
          }

          const users = (usersResult.data as any)?.users || [];
          const trips = (tripsResult.data as any)?.trips || [];
          const kycDocuments = (kycResult.data as KycDocument[]) || [];
          const subscriptionPlans = (plansResult.data as SubscriptionOffering[]) || [];
          const fundingRequests = (fundingResult.data as DocumentFundingRequest[]) || [];

          const dashboard = calculateDashboardMetrics(
            users,
            trips,
            kycDocuments,
            subscriptionPlans,
            fundingRequests
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
