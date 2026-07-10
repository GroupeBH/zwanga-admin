import { baseApi } from "../api/baseApi";
import type { Trip, PaginatedTripsResponse, TripStatus } from "../admin/types";

export interface TripsQueryParams {
  page?: number;
  limit?: number;
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
      transformResponse: (response: PaginatedTripsResponse) => response.trips,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Rides" as const, id })),
              { type: "Rides" as const, id: "LIST" },
            ]
          : [{ type: "Rides" as const, id: "LIST" }],
    }),

    // Get single trip details
    getTripById: builder.query<Trip, string>({
      query: (tripId) => `/trips/${tripId}`,
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
  overrideExisting: false,
});

export const {
  useGetAllTripsQuery,
  useGetTripByIdQuery,
  useGetAvailableTripsQuery,
  useUpdateAdminTripMutation,
  useDeactivateAdminTripMutation,
  useDeleteAdminTripMutation,
} = tripsApi;

