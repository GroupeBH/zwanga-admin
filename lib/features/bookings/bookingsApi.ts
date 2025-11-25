import { baseApi } from "../api/baseApi";
import type { Booking } from "../admin/types";

export const bookingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get bookings for a specific trip (driver only)
    getBookingsByTrip: builder.query<Booking[], string>({
      query: (tripId) => `/bookings/trip/${tripId}`,
      providesTags: (_result, _error, tripId) => [
        { type: "Rides", id: tripId },
        "Rides",
      ],
    }),

    // Get current user's bookings
    getMyBookings: builder.query<Booking[], void>({
      query: () => "/bookings/my-bookings",
      providesTags: ["Rides"],
    }),

    // Get single booking
    getBookingById: builder.query<Booking, string>({
      query: (bookingId) => `/bookings/${bookingId}`,
      providesTags: (_result, _error, id) => [{ type: "Rides", id }],
    }),

    // Accept booking (driver only)
    acceptBooking: builder.mutation<Booking, string>({
      query: (bookingId) => ({
        url: `/bookings/${bookingId}/accept`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Rides", id },
        { type: "Rides", id: "LIST" },
        "Dashboard",
      ],
    }),

    // Reject booking (driver only)
    rejectBooking: builder.mutation<Booking, { bookingId: string; reason: string }>({
      query: ({ bookingId, reason }) => ({
        url: `/bookings/${bookingId}/reject`,
        method: "PUT",
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { bookingId }) => [
        { type: "Rides", id: bookingId },
        { type: "Rides", id: "LIST" },
        "Dashboard",
      ],
    }),

    // Cancel booking (passenger)
    cancelBooking: builder.mutation<{ message: string }, string>({
      query: (bookingId) => ({
        url: `/bookings/${bookingId}/cancel`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Rides", id },
        { type: "Rides", id: "LIST" },
        "Dashboard",
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetBookingsByTripQuery,
  useGetMyBookingsQuery,
  useGetBookingByIdQuery,
  useAcceptBookingMutation,
  useRejectBookingMutation,
  useCancelBookingMutation,
} = bookingsApi;

