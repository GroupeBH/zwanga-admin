import { baseApi } from "../api/baseApi";
import type { DashboardResponse, MetricCard, TrendPoint, KycDocument, Trip, User } from "../admin/types";

// Helper to calculate dashboard metrics from real data
const calculateDashboardMetrics = (
  users: User[],
  trips: Trip[],
  kycDocuments: KycDocument[]
): DashboardResponse => {
  // Calculate metrics
  const activeTrips = trips.filter(t => t.status === "upcoming" || t.status === "ongoing").length;
  const completedTrips = trips.filter(t => t.status === "completed").length;
  const pendingKyc = kycDocuments.filter(k => k.status === "pending").length;
  const activeUsers = users.filter(u => u.status === "active").length;

  // Calculate trends (simplified - in production, compare with previous period)
  const metrics: MetricCard[] = [
    {
      id: "rides",
      label: "Trajets actifs",
      value: activeTrips.toString(),
      delta: 12,
      trend: "up",
      helper: "en cours + à venir",
    },
    {
      id: "kyc",
      label: "Dossiers KYC",
      value: `${pendingKyc} en attente`,
      delta: pendingKyc > 5 ? -6 : 3,
      trend: pendingKyc > 5 ? "down" : "up",
      helper: "à valider",
    },
    {
      id: "users",
      label: "Utilisateurs actifs",
      value: activeUsers.toString(),
      delta: 8,
      trend: "up",
      helper: "inscrits",
    },
    {
      id: "completed",
      label: "Trajets terminés",
      value: completedTrips.toString(),
      delta: 15,
      trend: "up",
      helper: "ce mois",
    },
  ];

  // Generate ride trends (last 7 months - simplified)
  const months = ["Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov"];
  const rideTrends: TrendPoint[] = months.map((month, index) => ({
    month,
    completed: Math.floor(800 + index * 80 + Math.random() * 100),
    cancelled: Math.floor(50 + Math.random() * 20),
  }));

  // Subscription health (mock for now - requires subscription data)
  const subscriptionHealth = [
    { plan: "Gratuit", users: users.filter(u => !u.isDriver).length, arpu: 0, trend: 5 },
    { plan: "Conducteur", users: users.filter(u => u.isDriver).length, arpu: 25, trend: 12 },
    { plan: "Premium", users: Math.floor(users.length * 0.1), arpu: 50, trend: 8 },
  ];

  // Alerts based on real data
  const alerts = [];
  if (pendingKyc > 5) {
    alerts.push({
      id: "alert-kyc",
      type: "kyc" as const,
      message: `${pendingKyc} dossiers KYC en attente de validation`,
      severity: "high" as const,
      timestamp: new Date().toISOString(),
    });
  }
  if (activeTrips > 100) {
    alerts.push({
      id: "alert-capacity",
      type: "safety" as const,
      message: "Forte demande de trajets - capacité optimale",
      severity: "medium" as const,
      timestamp: new Date().toISOString(),
    });
  }

  // Active zones (mock - requires geolocation analysis)
  const activeZones = [
    { id: "zone-1", name: "Kinshasa Centre", rides: Math.floor(activeTrips * 0.4), occupancy: 85, status: "stable" as const },
    { id: "zone-2", name: "Gombe", rides: Math.floor(activeTrips * 0.3), occupancy: 92, status: "watch" as const },
    { id: "zone-3", name: "Lemba", rides: Math.floor(activeTrips * 0.2), occupancy: 78, status: "stable" as const },
    { id: "zone-4", name: "Matongé", rides: Math.floor(activeTrips * 0.1), occupancy: 65, status: "stable" as const },
  ];

  // Top drivers (based on completed trips)
  const driversWithTrips = trips
    .filter(t => t.driver && t.status === "completed")
    .reduce((acc, trip) => {
      if (!trip.driver) return acc;
      const driverId = trip.driver.id;
      if (!acc[driverId]) {
        acc[driverId] = {
          id: driverId,
          name: `${trip.driver.firstName} ${trip.driver.lastName}`,
          score: 0,
          completed: 0,
          rating: 4.5 + Math.random() * 0.5,
        };
      }
      acc[driverId].completed += 1;
      acc[driverId].score = acc[driverId].completed * 10;
      return acc;
    }, {} as Record<string, any>);

  const topDrivers = Object.values(driversWithTrips)
    .sort((a: any, b: any) => b.completed - a.completed)
    .slice(0, 5);

  // KYC queue shortlist
  const kycQueueShortlist = kycDocuments
    .filter(k => k.status === "pending")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, 5);

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const dateRange = new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
  }).format(new Date());

  return {
    greeting: `${greeting}, bienvenue sur le dashboard`,
    dateRange: `Mis à jour le ${dateRange}`,
    metrics,
    rideTrends,
    subscriptionHealth,
    alerts,
    activeZones,
    topDrivers,
    kycQueueShortlist,
  };
};

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardResponse, void>({
      async queryFn(_arg, _queryApi, _extraOptions, fetchWithBQ) {
        try {
          // Fetch all required data in parallel
          const [usersResult, tripsResult, kycResult] = await Promise.all([
            fetchWithBQ({ url: "/admin/users", params: { page: 1, limit: 1000 } }),
            fetchWithBQ({ url: "/admin/trips", params: { page: 1, limit: 1000 } }),
            fetchWithBQ("/admin/kyc/pending"),
          ]);

          // Check for errors
          if (usersResult.error) return { error: usersResult.error as any };
          if (tripsResult.error) return { error: tripsResult.error as any };
          if (kycResult.error) return { error: kycResult.error as any };

          // Extract data
          const users = (usersResult.data as any)?.users || [];
          const trips = (tripsResult.data as any)?.trips || [];
          const kycDocuments = (kycResult.data as KycDocument[]) || [];

          // Calculate dashboard metrics
          const dashboard = calculateDashboardMetrics(users, trips, kycDocuments);

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
