import { baseApi } from "../api/baseApi";
import type { Trip, PaginatedTripsResponse } from "../admin/types";

export interface TripsQueryParams {
  page?: number;
  limit?: number;
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
  }),
  overrideExisting: false,
});

export const {
  useGetAllTripsQuery,
  useGetTripByIdQuery,
  useGetAvailableTripsQuery,
} = tripsApi;

