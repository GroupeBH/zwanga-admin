import { baseApi } from "../api/baseApi";

interface LoginWithPhonePayload {
  phone: string;
}

interface RegisterWithPhonePayload extends LoginWithPhonePayload {
  firstName: string;
  lastName: string;
  email?: string;
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
    registerWithPhone: builder.mutation<AuthResponse, RegisterWithPhonePayload>({
      query: (body) => ({
        url: "/auth/register",
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
  useLogoutMutation,
} = authApi;

