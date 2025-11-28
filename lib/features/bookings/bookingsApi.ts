import { baseApi } from "../api/baseApi";
import type { Booking } from "../admin/types";

export interface PaginatedBookingsResponse {
  bookings: Booking[];
  total: number;
  page: number;
  limit: number;
}

export interface BookingsQueryParams {
  page?: number;
  limit?: number;
  status?: string;
}

export const bookingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all bookings (admin only)
    getAllBookings: builder.query<PaginatedBookingsResponse, BookingsQueryParams | void>({
      query: ({ page = 1, limit = 100, status } = {}) => ({
        url: "/admin/bookings",
        params: { page, limit, ...(status && status !== "all" ? { status } : {}) },
      }),
      transformResponse: (response: PaginatedBookingsResponse): PaginatedBookingsResponse => {
        return {
          bookings: response.bookings,
          total: response.total,
          page: response.page,
          limit: response.limit,
        };
      },
      providesTags: (result) =>
        result?.bookings
          ? [
              ...result.bookings.map(({ id }) => ({ type: "Bookings" as const, id })),
              { type: "Bookings" as const, id: "LIST" },
            ]
          : [{ type: "Bookings" as const, id: "LIST" }],
    }),

    // Get bookings for a specific trip (driver only)
    getBookingsByTrip: builder.query<Booking[], string>({
      query: (tripId) => `/bookings/trip/${tripId}`,
      providesTags: (_result, _error, tripId) => [
        { type: "Bookings", id: tripId },
        "Bookings",
      ],
    }),

    // Get current user's bookings
    getMyBookings: builder.query<Booking[], void>({
      query: () => "/bookings/my-bookings",
      providesTags: ["Bookings"],
    }),

    // Get single booking
    getBookingById: builder.query<Booking, string>({
      query: (bookingId) => `/bookings/${bookingId}`,
      providesTags: (_result, _error, id) => [{ type: "Bookings", id }],
    }),

    // Accept booking (driver only)
    acceptBooking: builder.mutation<Booking, string>({
      query: (bookingId) => ({
        url: `/bookings/${bookingId}/accept`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Bookings", id },
        { type: "Bookings", id: "LIST" },
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
        { type: "Bookings", id: bookingId },
        { type: "Bookings", id: "LIST" },
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
        { type: "Bookings", id },
        { type: "Bookings", id: "LIST" },
        { type: "Rides", id: "LIST" },
        "Dashboard",
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllBookingsQuery,
  useGetBookingsByTripQuery,
  useGetMyBookingsQuery,
  useGetBookingByIdQuery,
  useAcceptBookingMutation,
  useRejectBookingMutation,
  useCancelBookingMutation,
} = bookingsApi;

