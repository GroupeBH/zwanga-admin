import { baseApi } from "../api/baseApi";

interface LoginWithPhonePayload {
  phoneNumber: string;
  password: string;
}

interface RegisterWithPhonePayload extends LoginWithPhonePayload {
  fullName: string;
  email?: string;
}

interface AuthMessage {
  message: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    loginWithPhone: builder.mutation<AuthMessage, LoginWithPhonePayload>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Dashboard", "AdminProfile"],
    }),
    registerWithPhone: builder.mutation<AuthMessage, RegisterWithPhonePayload>({
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

