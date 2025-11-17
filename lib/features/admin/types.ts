export type TrendDirection = "up" | "down" | "flat";

export interface MetricCard {
  id: string;
  label: string;
  value: string;
  delta: number;
  trend: TrendDirection;
  helper: string;
}

export interface TrendPoint {
  month: string;
  completed: number;
  cancelled: number;
}

export interface SubscriptionHealth {
  plan: string;
  users: number;
  arpu: number;
  trend: number;
}

export interface AlertItem {
  id: string;
  type: "kyc" | "support" | "safety" | "payment";
  message: string;
  severity: "low" | "medium" | "high";
  timestamp: string;
}

export interface ZoneStat {
  id: string;
  name: string;
  rides: number;
  occupancy: number;
  status: "stable" | "watch" | "critical";
}

export interface DriverHighlight {
  id: string;
  name: string;
  score: number;
  completed: number;
  rating: number;
}

export type KycStatus = "pending" | "approved" | "rejected";

export interface AdminUserSummary {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
}

export interface KycDocument {
  id: string;
  userId: string;
  user: AdminUserSummary;
  cniFrontUrl?: string;
  cniBackUrl?: string;
  selfieUrl?: string;
  status: KycStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardResponse {
  greeting: string;
  dateRange: string;
  metrics: MetricCard[];
  rideTrends: TrendPoint[];
  subscriptionHealth: SubscriptionHealth[];
  alerts: AlertItem[];
  activeZones: ZoneStat[];
  topDrivers: DriverHighlight[];
  kycQueueShortlist: KycDocument[];
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: "Essai" | "Actif" | "Expiré";
  rides: number;
  rating: number;
  status: "actif" | "suspendu" | "en revue";
  lastRide: string;
}

export interface RideRecord {
  id: string;
  driver: string;
  departure: string;
  arrival: string;
  status: "actif" | "terminé" | "annulé";
  seats: number;
  price: number;
  departureTime: string;
  demandLevel: "haut" | "moyen" | "bas";
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: "Essai" | "Pro" | "Entreprise";
  price: number;
  riders: number;
  renewalRate: number;
  paymentProviders: string[];
  lastInvoice: string;
}

export interface IncidentReport {
  id: string;
  type: "sécurité" | "paiement" | "comportement" | "qualité";
  reporter: string;
  description: string;
  status: "ouvert" | "en cours" | "résolu";
  priority: "haute" | "moyenne" | "basse";
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  channel: "Email" | "WhatsApp" | "Chat" | "Téléphone";
  requester: string;
  topic: string;
  status: "nouveau" | "en cours" | "clos";
  sla: string;
  lastUpdate: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  category: "KYC" | "Signalement" | "Utilisateur" | "Support";
  description: string;
  createdAt: string;
  read: boolean;
}

export interface AdminProfile {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  lastConnection: string;
  avatarUrl?: string;
  stats: {
    kycValidated: number;
    ticketsResolved: number;
    actionsThisWeek: number;
    securityLevel: "Standard" | "Renforcé";
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange: string;
    trustedDevices: string[];
  };
}

