import type {
  AdministrativeDocumentType,
  DocumentFundingRequest,
  DocumentFundingRequestStatus,
  PaymentMethod,
  PaymentOverview,
  RouteInsight,
  SubscriptionOffering,
  Trip,
  TripLifecycleBucket,
  TripLifecycleStatus,
  TrendPoint,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const TRIP_EXPIRATION_GRACE_MS = 2 * 60 * 60 * 1000;

const lifecycleLabels: Record<TripLifecycleStatus, string> = {
  upcoming: "A venir",
  ongoing: "En cours",
  completed: "Termines",
  cancelled: "Annules",
  expired: "Expires",
};

const lifecycleHelpers: Record<TripLifecycleStatus, string> = {
  upcoming: "depart programme",
  ongoing: "suivi temps reel",
  completed: "trajets clotures",
  cancelled: "publication annulee",
  expired: "depart depasse de plus de 2h",
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  mobile_money: "Mobile Money",
  card: "Carte",
};

const documentTypeLabels: Record<AdministrativeDocumentType, string> = {
  driver_license: "Permis de conduire",
  vehicle_registration: "Carte grise",
  vehicle_insurance: "Assurance vehicule",
  technical_inspection: "Controle technique",
  road_tax: "Taxe routiere",
  operating_permit: "Autorisation d'exploitation",
  other: "Autre document",
};

const fundingStatusLabels: Record<DocumentFundingRequestStatus, string> = {
  pending: "En attente",
  approved: "Approuvee",
  rejected: "Rejetee",
  funded: "Financee",
  cancelled: "Annulee",
};

export const getTripLifecycleStatus = (
  trip: Trip,
  now: Date = new Date()
): TripLifecycleStatus => {
  if (trip.status === "cancelled") {
    return "cancelled";
  }

  if (trip.status === "ongoing") {
    return "ongoing";
  }

  if (trip.status === "completed") {
    return "completed";
  }

  const departureTime = new Date(trip.departureDate).getTime();
  if (departureTime < now.getTime() - TRIP_EXPIRATION_GRACE_MS) {
    return "expired";
  }

  return "upcoming";
};

export const getTripLifecycleLabel = (status: TripLifecycleStatus) =>
  lifecycleLabels[status];

export const buildTripLifecycleBuckets = (
  trips: Trip[],
  now: Date = new Date()
): TripLifecycleBucket[] => {
  const counts = trips.reduce<Record<TripLifecycleStatus, number>>(
    (acc, trip) => {
      const status = getTripLifecycleStatus(trip, now);
      acc[status] += 1;
      return acc;
    },
    {
      upcoming: 0,
      ongoing: 0,
      completed: 0,
      cancelled: 0,
      expired: 0,
    }
  );

  const order: TripLifecycleStatus[] = [
    "ongoing",
    "upcoming",
    "completed",
    "expired",
    "cancelled",
  ];

  return order.map((key) => ({
    key,
    label: lifecycleLabels[key],
    count: counts[key],
    helper: lifecycleHelpers[key],
  }));
};

export const buildTripTimeline = (
  trips: Trip[],
  now: Date = new Date()
): TrendPoint[] => {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfToday.getTime() - (6 - index) * DAY_MS);
    return {
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("fr-CD", {
        day: "2-digit",
        month: "short",
      }).format(date),
    };
  });

  const publishedByDay = new Map<string, number>();
  const completedByDay = new Map<string, number>();

  for (const trip of trips) {
    const createdKey = new Date(trip.createdAt).toISOString().slice(0, 10);
    publishedByDay.set(createdKey, (publishedByDay.get(createdKey) ?? 0) + 1);

    if (trip.completedAt) {
      const completedKey = new Date(trip.completedAt).toISOString().slice(0, 10);
      completedByDay.set(
        completedKey,
        (completedByDay.get(completedKey) ?? 0) + 1
      );
    }
  }

  return days.map((day) => ({
    label: day.label,
    published: publishedByDay.get(day.key) ?? 0,
    completed: completedByDay.get(day.key) ?? 0,
  }));
};

export const buildRouteInsights = (
  trips: Trip[],
  now: Date = new Date()
): RouteInsight[] => {
  const grouped = new Map<string, RouteInsight>();

  for (const trip of trips) {
    const route = `${trip.departureLocation} -> ${trip.arrivalLocation}`;
    const existing = grouped.get(route) ?? {
      id: route.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      route,
      total: 0,
      live: 0,
      completed: 0,
      expired: 0,
    };

    existing.total += 1;
    const lifecycle = getTripLifecycleStatus(trip, now);
    if (lifecycle === "ongoing") {
      existing.live += 1;
    }
    if (lifecycle === "completed") {
      existing.completed += 1;
    }
    if (lifecycle === "expired") {
      existing.expired += 1;
    }

    grouped.set(route, existing);
  }

  return Array.from(grouped.values())
    .sort((a, b) => {
      if (b.total !== a.total) {
        return b.total - a.total;
      }
      if (b.live !== a.live) {
        return b.live - a.live;
      }
      return b.completed - a.completed;
    })
    .slice(0, 5);
};

export const buildPaymentOverview = (
  plans: SubscriptionOffering[],
  requests: DocumentFundingRequest[]
): PaymentOverview => {
  const methodSet = new Set<PaymentMethod>();
  const currencySet = new Set<string>();

  for (const plan of plans) {
    for (const method of plan.paymentMethods) {
      methodSet.add(method);
    }
    currencySet.add(plan.currency);
    if (plan.documentFundingCurrency) {
      currencySet.add(plan.documentFundingCurrency);
    }
  }

  let totalRequestedAmount = 0;
  let pendingAmount = 0;
  let pendingFundingRequests = 0;
  let approvedFundingRequests = 0;
  let fundedRequests = 0;
  let rejectedRequests = 0;

  for (const request of requests) {
    const amount = Number(request.amountRequested ?? 0);
    if (Number.isFinite(amount)) {
      totalRequestedAmount += amount;
      if (request.status === "pending") {
        pendingAmount += amount;
      }
    }

    if (request.currency) {
      currencySet.add(request.currency);
    }

    if (request.status === "pending") {
      pendingFundingRequests += 1;
    }
    if (request.status === "approved") {
      approvedFundingRequests += 1;
    }
    if (request.status === "funded") {
      fundedRequests += 1;
    }
    if (request.status === "rejected") {
      rejectedRequests += 1;
    }
  }

  return {
    supportedMethods: Array.from(methodSet.values()),
    supportedCurrencies: Array.from(currencySet.values()).sort(),
    pendingFundingRequests,
    approvedFundingRequests,
    fundedRequests,
    rejectedRequests,
    totalRequestedAmount,
    pendingAmount,
  };
};

export const formatPaymentMethod = (method: PaymentMethod) =>
  paymentMethodLabels[method] ?? method;

export const formatDocumentType = (type: AdministrativeDocumentType) =>
  documentTypeLabels[type] ?? type;

export const formatFundingStatus = (status: DocumentFundingRequestStatus) =>
  fundingStatusLabels[status] ?? status;

export const formatSubscriptionPlanLabel = (plan: string) => {
  if (plan === "pro") {
    return "Pro";
  }
  if (plan === "monthly") {
    return "Mensuel";
  }
  if (plan === "yearly") {
    return "Annuel";
  }
  return plan;
};

export const formatSubscriptionFeatureList = (plan: SubscriptionOffering) => {
  const features: string[] = [];

  if (plan.premiumBadgeEnabled) {
    features.push("badge premium");
  }
  if (plan.featuredTripsEnabled) {
    features.push("trajets mis en avant");
  }
  if (plan.documentFundingEnabled) {
    features.push("financement documentaire");
  }

  return features;
};
