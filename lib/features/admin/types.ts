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

// Nest backend enums
export type UserRole = "driver" | "passenger" | "admin";
export type UserStatus = "active" | "inactive" | "suspended" | "pending_kyc";
export type KycStatus = "pending" | "approved" | "rejected";

// User entity from Nest
export interface User {
  id: string;
  email?: string;
  phone: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  role: UserRole;
  status: UserStatus;
  fcmToken?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  isDriver: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// KYC Document entity from Nest
export interface KycDocument {
  id: string;
  userId: string;
  user: User;
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

// Admin user profile with stats
export interface AdminProfile {
  user: User;
  stats: {
    vehicles: number;
    tripsAsDriver: number;
    bookingsAsPassenger: number;
    bookingsAsDriver: number;
    messagesSent: number;
  };
}

// Trip types from Nest backend
export type TripStatus = "upcoming" | "ongoing" | "completed" | "cancelled";
export type Coordinates = [number, number] | null;

export interface SanitizedUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  profilePicture: string | null;
  role: UserRole;
  status: UserStatus;
  isDriver: boolean;
}

export interface Trip {
  id: string;
  driverId: string;
  driver: SanitizedUser | null;
  departureLocation: string;
  departureCoordinates: Coordinates;
  arrivalLocation: string;
  arrivalCoordinates: Coordinates;
  departureDate: string;
  availableSeats: number;
  pricePerSeat: number;
  description?: string;
  status: TripStatus;
  completedAt?: string;
  currentLocation?: Coordinates;
  lastLocationUpdateAt?: string;
  createdAt: string;
  updatedAt: string;
  bookings: Booking[];
}

// Booking types from Nest backend
export type BookingStatus = "pending" | "accepted" | "rejected" | "cancelled" | "completed";

export interface Booking {
  id: string;
  tripId: string;
  passengerId: string;
  passenger: SanitizedUser | null;
  numberOfSeats: number;
  status: BookingStatus;
  rejectionReason?: string | null;
  acceptedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Vehicle types from Nest backend
export interface Vehicle {
  id: string;
  ownerId: string;
  brand: string;
  model: string;
  color: string;
  licensePlate: string;
  photoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

// Paginated response from Nest
export interface PaginatedUsersResponse {
  users: User[];
  total: number;
}

export interface PaginatedTripsResponse {
  trips: Trip[];
  total: number;
}

