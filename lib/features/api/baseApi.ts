import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { setAuthenticated } from "../auth/authSlice";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from "@/lib/utils/cookies";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_PUBLIC_URL || "http://localhost:3333";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

const isAuthResponse = (value: unknown): value is AuthResponse => {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as AuthResponse).accessToken === "string" &&
    typeof (value as AuthResponse).refreshToken === "string"
  );
};

const getRequestUrl = (args: string | FetchArgs) =>
  typeof args === "string" ? args : args.url;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: "include",
  prepareHeaders: (headers) => {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  const requestUrl = getRequestUrl(args);
  const refreshToken = getRefreshToken();

  if (result.error?.status === 401 && refreshToken && !requestUrl.startsWith("/auth/")) {
    const refreshResult = await rawBaseQuery(
      {
        url: "/auth/refresh",
        method: "POST",
        body: { refreshToken },
      },
      api,
      extraOptions
    );

    if (isAuthResponse(refreshResult.data)) {
      setAuthTokens(refreshResult.data.accessToken, refreshResult.data.refreshToken);
      api.dispatch(setAuthenticated(true));
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      clearAuthTokens();
      api.dispatch(setAuthenticated(false));
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "adminApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    "Dashboard",
    "Users",
    "KYC",
    "Rides",
    "Bookings",
    "TripRequests",
    "Payments",
    "Wallets",
    "Referrals",
    "Vehicles",
    "Subscriptions",
    "Reports",
    "Support",
    "Notifications",
    "AdminProfile",
  ],
  endpoints: () => ({}),
});

