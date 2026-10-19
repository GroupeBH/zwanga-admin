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

export interface AdminVehicleOwner {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
}

export interface AdminVehicle extends Vehicle {
  type?: string | null;
  owner?: AdminVehicleOwner | null;
}

export interface AdminVehiclesParams {
  page?: number;
  limit?: number;
  /** car | motorcycle_2_wheels | motorcycle_3_wheels */
  vehicleType?: string;
  /** "true" | "false"; absent = tous. */
  isActive?: "true" | "false";
  search?: string;
}

export interface PaginatedAdminVehicles {
  vehicles: AdminVehicle[];
  total: number;
}

export const vehiclesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Admin: tous les véhicules avec leur propriétaire
    getAdminVehicles: builder.query<PaginatedAdminVehicles, AdminVehiclesParams | void>({
      query: ({ page = 1, limit = 20, vehicleType, isActive, search } = {}) => ({
        url: "/admin/vehicles",
        params: {
          page,
          limit,
          ...(vehicleType ? { vehicleType } : {}),
          ...(isActive ? { isActive } : {}),
          ...(search ? { search } : {}),
        },
      }),
      transformResponse: (response: unknown): PaginatedAdminVehicles => {
        const record =
          response && typeof response === "object" && !Array.isArray(response)
            ? (response as Record<string, unknown>)
            : {};
        const vehicles = Array.isArray(response)
          ? (response as AdminVehicle[])
          : Array.isArray(record.vehicles)
            ? (record.vehicles as AdminVehicle[])
            : [];
        return {
          vehicles,
          total: typeof record.total === "number" ? record.total : vehicles.length,
        };
      },
      providesTags: [{ type: "Vehicles", id: "LIST" }],
    }),
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
  useGetAdminVehiclesQuery,
  useGetMyVehiclesQuery,
  useGetVehicleByIdQuery,
  useCreateVehicleMutation,
  useUpdateVehicleMutation,
  useDeleteVehicleMutation,
} = vehiclesApi;

