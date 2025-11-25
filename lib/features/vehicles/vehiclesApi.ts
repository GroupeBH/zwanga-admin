import { baseApi } from "../api/baseApi";
import type { Vehicle } from "../admin/types";

export interface CreateVehiclePayload {
  brand: string;
  model: string;
  color: string;
  licensePlate: string;
  photoUrl?: string;
}

export interface UpdateVehiclePayload {
  brand?: string;
  model?: string;
  color?: string;
  licensePlate?: string;
  photoUrl?: string;
  isActive?: boolean;
}

export const vehiclesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all vehicles for current user
    getMyVehicles: builder.query<Vehicle[], void>({
      query: () => "/vehicles",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Rides" as const, id })),
              { type: "Rides" as const, id: "VEHICLES" },
            ]
          : [{ type: "Rides" as const, id: "VEHICLES" }],
    }),

    // Get single vehicle
    getVehicleById: builder.query<Vehicle, string>({
      query: (vehicleId) => `/vehicles/${vehicleId}`,
      providesTags: (_result, _error, id) => [{ type: "Rides", id }],
    }),

    // Create vehicle
    createVehicle: builder.mutation<Vehicle, CreateVehiclePayload>({
      query: (body) => ({
        url: "/vehicles",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Rides", id: "VEHICLES" }, "AdminProfile"],
    }),

    // Update vehicle
    updateVehicle: builder.mutation<Vehicle, { vehicleId: string; data: UpdateVehiclePayload }>({
      query: ({ vehicleId, data }) => ({
        url: `/vehicles/${vehicleId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { vehicleId }) => [
        { type: "Rides", id: vehicleId },
        { type: "Rides", id: "VEHICLES" },
      ],
    }),

    // Delete vehicle
    deleteVehicle: builder.mutation<{ message: string }, string>({
      query: (vehicleId) => ({
        url: `/vehicles/${vehicleId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Rides", id },
        { type: "Rides", id: "VEHICLES" },
        "AdminProfile",
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMyVehiclesQuery,
  useGetVehicleByIdQuery,
  useCreateVehicleMutation,
  useUpdateVehicleMutation,
  useDeleteVehicleMutation,
} = vehiclesApi;

