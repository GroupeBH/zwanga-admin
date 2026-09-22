import { baseApi } from "../api/baseApi";
import type { Booking } from "../admin/types";
import { listProvidesTags, unwrapList } from "@/lib/utils/toList";

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
      serializeQueryArgs: ({ queryArgs }) => {
        const args = queryArgs ?? {};
        return `bookings-${args.page ?? 1}-${args.limit ?? 100}-${args.status ?? "all"}`;
      },
      forceRefetch({ currentArg, previousArg }) {
        return (
          currentArg?.status !== previousArg?.status ||
          currentArg?.page !== previousArg?.page ||
          currentArg?.limit !== previousArg?.limit
        );
      },
      transformResponse: (response: unknown): PaginatedBookingsResponse => {
        const bookings = unwrapList<Booking>(response, "bookings");
        const record =
          response && typeof response === "object" && !Array.isArray(response)
            ? (response as Record<string, unknown>)
            : {};
        return {
          bookings,
          total: typeof record.total === "number" ? record.total : bookings.length,
          page: typeof record.page === "number" ? record.page : 1,
          limit: typeof record.limit === "number" ? record.limit : bookings.length,
        };
      },
      providesTags: (result) => listProvidesTags("Bookings", result?.bookings),
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
        url: `/admin/bookings/${bookingId}/accept`,
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
        url: `/admin/bookings/${bookingId}/reject`,
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
    cancelBooking: builder.mutation<Booking, string>({
      query: (bookingId) => ({
        url: `/admin/bookings/${bookingId}/cancel`,
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
  overrideExisting: true,
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

