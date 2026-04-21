export type MetricTone = "neutral" | "success" | "warning" | "danger";

export interface MetricCard {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone: MetricTone;
}

export interface TrendPoint {
  label: string;
  published: number;
  completed: number;
}

export interface AlertItem {
  id: string;
  type: "kyc" | "support" | "safety" | "payment" | "subscription";
  message: string;
  severity: "low" | "medium" | "high";
  timestamp: string;
}

export interface RouteInsight {
  id: string;
  route: string;
  total: number;
  live: number;
  completed: number;
  expired: number;
}

export interface DriverHighlight {
  id: string;
  name: string;
  score: number;
  completed: number;
  rating: number;
}

export type TripLifecycleStatus =
  | "upcoming"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "expired";

export interface TripLifecycleBucket {
  key: TripLifecycleStatus;
  label: string;
  count: number;
  helper: string;
}

export type PaymentMethod = "mobile_money" | "card";
export type PaymentStatus =
  | "pending"
  | "initiated"
  | "succeeded"
  | "failed"
  | "cancelled";

export type SubscriptionStatus =
  | "pending"
  | "active"
  | "expired"
  | "cancelled"
  | "payment_failed";

export type SubscriptionPlanCode = "pro" | "monthly" | "yearly";

export type AdministrativeDocumentType =
  | "driver_license"
  | "vehicle_registration"
  | "vehicle_insurance"
  | "technical_inspection"
  | "road_tax"
  | "operating_permit"
  | "other";

export type DocumentFundingRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "funded"
  | "cancelled";

export interface PaymentOverview {
  supportedMethods: PaymentMethod[];
  supportedCurrencies: string[];
  pendingFundingRequests: number;
  approvedFundingRequests: number;
  fundedRequests: number;
  rejectedRequests: number;
  totalRequestedAmount: number;
  pendingAmount: number;
}

export interface SubscriptionOffering {
  plan: SubscriptionPlanCode;
  amount: number;
  currency: string;
  premiumBadgeEnabled: boolean;
  featuredTripsEnabled: boolean;
  documentFundingEnabled: boolean;
  documentFundingLimit: number | null;
  documentFundingCurrency: string;
  paymentMethods: PaymentMethod[];
  eligibleDocumentTypes: AdministrativeDocumentType[];
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  user?: User | null;
  plan: SubscriptionPlanCode;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  amount: number;
  currency: string;
  premiumBadgeEnabled: boolean;
  featuredTripsEnabled: boolean;
  documentFundingEnabled: boolean;
  documentFundingLimit: number | null;
  documentFundingCurrency: string;
  paymentReference?: string | null;
  paymentTransactionId?: string | null;
  isTrial: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFundingRequest {
  id: string;
  driverId: string;
  driver: User | SanitizedUser | null;
  subscriptionId: string | null;
  subscription: SubscriptionRecord | null;
  documentType: AdministrativeDocumentType;
  documentName?: string | null;
  amountRequested?: number | null;
  currency: string;
  description?: string | null;
  status: DocumentFundingRequestStatus;
  adminNote?: string | null;
  reviewedAt?: string | null;
  reviewedByAdminId?: string | null;
  createdAt: string;
  updatedAt: string;
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
  tripTrends: TrendPoint[];
  tripLifecycle: TripLifecycleBucket[];
  subscriptionPlans: SubscriptionOffering[];
  paymentOverview: PaymentOverview;
  alerts: AlertItem[];
  popularRoutes: RouteInsight[];
  topDrivers: DriverHighlight[];
  recentFundingRequests: DocumentFundingRequest[];
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
  vehicleId?: string | null;
  departureLocation: string;
  departureCoordinates: Coordinates;
  arrivalLocation: string;
  arrivalCoordinates: Coordinates;
  departureDate: string;
  totalSeats?: number | null;
  availableSeats: number;
  pricePerSeat: number;
  isFree?: boolean;
  description?: string;
  status: TripStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  currentLocation?: Coordinates;
  lastLocationUpdateAt?: string | null;
  isPrivate?: boolean;
  createdAt: string;
  updatedAt: string;
  bookings?: Booking[];
}

// Booking types from Nest backend
export type BookingStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed"
  | "expired";

export interface Booking {
  id: string;
  tripId: string;
  trip?: Trip;
  passengerId: string;
  passenger: User | null;
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

// Legacy dashboard/reporting types kept for compatibility with mock-backed pages.
export interface SubscriptionHealth {
  plan: string;
  users: number;
  arpu: number;
  trend: number;
}

export interface ZoneStat {
  id: string;
  name: string;
  rides: number;
  occupancy: number;
  status: "stable" | "watch" | "critical";
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
  type: string;
  reporter: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  channel: string;
  requester: string;
  topic: string;
  status: string;
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
