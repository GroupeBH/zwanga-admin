import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { getAccessToken } from "@/lib/utils/cookies";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_PUBLIC_URL || "http://localhost:3333";

const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const baseQuery = fetchBaseQuery({
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

  return baseQuery(args, api, extraOptions);
};

export const baseApi = createApi({
  reducerPath: "adminApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: [
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
  endpoints: () => ({}),
});

