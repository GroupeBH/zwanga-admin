import { baseApi } from "../api/baseApi";

type LoginWithPhonePayload =
  | { phone: string; pin: string; newPin?: never }
  | { phone: string; pin?: never; newPin: string };

interface RegisterWithPhonePayload {
  phone: string;
  pin: string;
  firstName: string;
  lastName: string;
  role: "driver" | "passenger" | "admin";
  isDriver?: boolean;
  vehicle?: {
    brand: string;
    model: string;
    color: string;
    licensePlate: string;
    photoUrl?: string;
  };
}

interface GoogleMobileAuthPayload {
  idToken: string;
  phone?: string;
}

interface RefreshTokenPayload {
  refreshToken: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user?: {
    id: string;
    phone: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface AuthMessage {
  message: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    loginWithPhone: builder.mutation<AuthResponse, LoginWithPhonePayload>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Dashboard", "AdminProfile"],
    }),
    registerWithPhone: builder.mutation<AuthResponse, RegisterWithPhonePayload | FormData>({
      query: (body) => ({
        url: "/auth/register",
        method: "POST",
        body,
      }),
    }),
    refresh: builder.mutation<AuthResponse, RefreshTokenPayload>({
      query: (body) => ({
        url: "/auth/refresh",
        method: "POST",
        body,
      }),
    }),
    googleMobile: builder.mutation<AuthResponse, GoogleMobileAuthPayload>({
      query: (body) => ({
        url: "/auth/google/mobile",
        method: "POST",
        body,
      }),
    }),
    logout: builder.mutation<AuthMessage, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      invalidatesTags: [
        "Dashboard",
        "Users",
        "KYC",
        "Rides",
        "Subscriptions",
        "Reports",
        "Support",
        "Notifications",
        "AdminProfile",
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useLoginWithPhoneMutation,
  useRegisterWithPhoneMutation,
  useRefreshMutation,
  useGoogleMobileMutation,
  useLogoutMutation,
} = authApi;

