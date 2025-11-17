import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_PUBLIC_URL ??
  process.env.API_PUBLIC_URL ??
  "http://localhost:3333";

export const baseApi = createApi({
  reducerPath: "adminApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: "include",
  }),
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

