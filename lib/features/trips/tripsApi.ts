import { baseApi } from "../api/baseApi";
import type { Trip, PaginatedTripsResponse, TripStatus } from "../admin/types";
import { listProvidesTags, unwrapList } from "@/lib/utils/toList";

export interface TripsQueryParams {
  page?: number;
  limit?: number;
}

export interface StatementPerson {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

export interface TripStatement {
  trip: {
    id: string;
    departureLocation: string;
    arrivalLocation: string;
    departureDate: string;
    status: string;
    totalSeats: number | null;
    availableSeats: number;
    pricePerSeat: number;
    isFree: boolean;
    isPrivate: boolean;
    description: string | null;
    acceptedPaymentModes: string[];
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    driver: StatementPerson | null;
    vehicle: {
      brand: string;
      model: string;
      color: string;
      licensePlate: string;
      type: string;
    } | null;
  };
  rates: { commissionRate: number; referralRate: number; retainedRate: number };
  booked: {
    fare: number;
    paid: number;
    subsidy: number;
    commission: number;
    referral: number;
    driver: number;
    zwanga: number;
    tokenDebt: number;
    seats: number;
  };
  openSeats: { seats: number; fare: number; driver: number; zwanga: number; note: string | null };
  bookings: Array<{
    id: string;
    status: string;
    paymentMode: string;
    paymentStatus: string;
    seats: number;
    passenger: StatementPerson | null;
    fare: number;
    paid: number;
    subsidy: number;
    commission: number;
    referral: number;
    referralState: "none" | "potential" | "recorded" | "reversed";
    referrer: StatementPerson | null;
    driver: number;
    zwanga: number;
    tokenDebt: number;
    currency: string;
    earning: { status: string; netAmount: number; commissionAmount: number } | null;
  }>;
}

export interface UpdateTripPayload {
  departureLocation?: string;
  arrivalLocation?: string;
  departureDate?: string;
  totalSeats?: number;
  pricePerSeat?: number;
  isFree?: boolean;
  description?: string;
  status?: TripStatus;
  vehicleId?: string | null;
}

export const tripsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Admin: Get all trips with pagination
    getAllTrips: builder.query<Trip[], TripsQueryParams | void>({
      query: ({ page = 1, limit = 100 } = {}) => ({
        url: "/admin/trips",
        params: { page, limit },
      }),
      transformResponse: (response: PaginatedTripsResponse | Trip[]) =>
        unwrapList<Trip>(response, "trips"),
      providesTags: (result) => listProvidesTags("Rides", result),
    }),

    // Get single trip details
    getTripById: builder.query<Trip, string>({
      query: (tripId) => `/trips/${tripId}`,
      providesTags: (_result, _error, id) => [{ type: "Rides", id }],
    }),

    getTripStatement: builder.query<TripStatement, string>({
      query: (tripId) => `/admin/trips/${tripId}/statement`,
      providesTags: (_result, _error, id) => [{ type: "Rides", id }],
    }),

    // Get all available trips (public)
    getAvailableTrips: builder.query<Trip[], void>({
      query: () => "/trips",
      providesTags: [{ type: "Rides", id: "LIST" }],
    }),

    updateAdminTrip: builder.mutation<Trip, { tripId: string; payload: UpdateTripPayload }>({
      query: ({ tripId, payload }) => ({
        url: `/admin/trips/${tripId}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (_result, _error, { tripId }) => [
        { type: "Rides", id: tripId },
        { type: "Rides", id: "LIST" },
        { type: "Bookings", id: "LIST" },
        "Dashboard",
      ],
    }),

    deactivateAdminTrip: builder.mutation<Trip, string>({
      query: (tripId) => ({
        url: `/admin/trips/${tripId}/deactivate`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, tripId) => [
        { type: "Rides", id: tripId },
        { type: "Rides", id: "LIST" },
        { type: "Bookings", id: "LIST" },
        "Dashboard",
      ],
    }),

    deleteAdminTrip: builder.mutation<{ message: string }, string>({
      query: (tripId) => ({
        url: `/admin/trips/${tripId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, tripId) => [
        { type: "Rides", id: tripId },
        { type: "Rides", id: "LIST" },
        { type: "Bookings", id: "LIST" },
        "Dashboard",
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetAllTripsQuery,
  useGetTripByIdQuery,
  useGetTripStatementQuery,
  useGetAvailableTripsQuery,
  useUpdateAdminTripMutation,
  useDeactivateAdminTripMutation,
  useDeleteAdminTripMutation,
} = tripsApi;

