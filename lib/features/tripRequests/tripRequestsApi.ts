import { baseApi } from "../api/baseApi";
import type {
  PaginatedTripRequestsResponse,
  TripPaymentMode,
  TripRequest,
  TripRequestStatus,
} from "../admin/types";

export interface TripRequestsQueryParams {
  page?: number;
  limit?: number;
  status?: TripRequestStatus | "all";
}

export interface UpdateTripRequestPayload {
  departureLocation?: string;
  departureReference?: string;
  arrivalLocation?: string;
  arrivalReference?: string;
  departureDateMin?: string;
  departureDateMax?: string;
  numberOfSeats?: number;
  maxPricePerSeat?: number | null;
  paymentMode?: TripPaymentMode;
  description?: string | null;
}

export const tripRequestsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllTripRequests: builder.query<
      PaginatedTripRequestsResponse,
      TripRequestsQueryParams | void
    >({
      query: ({ page = 1, limit = 50, status } = {}) => ({
        url: "/admin/trip-requests",
        params: {
          page,
          limit,
          ...(status && status !== "all" ? { status } : {}),
        },
      }),
      providesTags: (result) =>
        result?.tripRequests
          ? [
              ...result.tripRequests.map(({ id }) => ({
                type: "TripRequests" as const,
                id,
              })),
              { type: "TripRequests" as const, id: "LIST" },
            ]
          : [{ type: "TripRequests" as const, id: "LIST" }],
    }),

    getTripRequestById: builder.query<TripRequest, string>({
      query: (tripRequestId) => `/admin/trip-requests/${tripRequestId}`,
      providesTags: (_result, _error, id) => [{ type: "TripRequests", id }],
    }),

    updateAdminTripRequest: builder.mutation<
      TripRequest,
      { tripRequestId: string; payload: UpdateTripRequestPayload }
    >({
      query: ({ tripRequestId, payload }) => ({
        url: `/admin/trip-requests/${tripRequestId}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (_result, _error, { tripRequestId }) => [
        { type: "TripRequests", id: tripRequestId },
        { type: "TripRequests", id: "LIST" },
        "Dashboard",
      ],
    }),

    deactivateAdminTripRequest: builder.mutation<TripRequest, string>({
      query: (tripRequestId) => ({
        url: `/admin/trip-requests/${tripRequestId}/deactivate`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, tripRequestId) => [
        { type: "TripRequests", id: tripRequestId },
        { type: "TripRequests", id: "LIST" },
        "Dashboard",
      ],
    }),

    deleteAdminTripRequest: builder.mutation<{ message: string }, string>({
      query: (tripRequestId) => ({
        url: `/admin/trip-requests/${tripRequestId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, tripRequestId) => [
        { type: "TripRequests", id: tripRequestId },
        { type: "TripRequests", id: "LIST" },
        "Dashboard",
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllTripRequestsQuery,
  useGetTripRequestByIdQuery,
  useUpdateAdminTripRequestMutation,
  useDeactivateAdminTripRequestMutation,
  useDeleteAdminTripRequestMutation,
} = tripRequestsApi;
