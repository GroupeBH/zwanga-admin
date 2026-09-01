import { baseApi } from "../api/baseApi";

interface LoginWithPhonePayload {
  phone: string;
  password: string;
}

interface RefreshTokenPayload {
  refreshToken: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  passwordChangeRequired?: boolean;
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

interface ChangeAdminPasswordPayload {
  currentPassword: string;
  newPassword: string;
}

interface ChangeAdminPasswordResponse {
  message: string;
  passwordChangeRequired: boolean;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    loginWithPhone: builder.mutation<AuthResponse, LoginWithPhonePayload>({
      query: (body) => ({
        url: "/auth/admin/login",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Dashboard", "AdminProfile"],
    }),
    refresh: builder.mutation<AuthResponse, RefreshTokenPayload>({
      query: (body) => ({
        url: "/auth/refresh",
        method: "POST",
        body,
      }),
    }),
    changeAdminPassword: builder.mutation<
      ChangeAdminPasswordResponse,
      ChangeAdminPasswordPayload
    >({
      query: (body) => ({
        url: "/auth/admin/password/change",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AdminProfile"],
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
  useRefreshMutation,
  useChangeAdminPasswordMutation,
  useLogoutMutation,
} = authApi;

