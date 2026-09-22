import { baseApi } from "../api/baseApi";
import type { UserRole, UserStatus } from "../admin/types";

export type ReportReason =
  | "inappropriate_behavior"
  | "harassment"
  | "safety_concern"
  | "fraud"
  | "other";

export type ReportStatus = "pending" | "under_review" | "resolved" | "dismissed";

/** Statuts que le back-office peut appliquer: un signalement ne revient
    jamais a l'etat initial « pending ». */
export type ReportStatusDecision = Exclude<ReportStatus, "pending">;

export interface UserReportParty {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
}

export interface UserReport {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reporter: UserReportParty | null;
  reportedUser: UserReportParty | null;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  tripId: string | null;
  bookingId: string | null;
  tripRoute: string | null;
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserReportsResponse {
  reports: UserReport[];
  total: number;
  page: number;
  limit: number;
}

export interface ListUserReportsQuery {
  page?: number;
  limit?: number;
  status?: ReportStatus;
  reason?: ReportReason;
  search?: string;
}

export interface UpdateReportStatusPayload {
  status: ReportStatusDecision;
  adminNotes?: string;
}

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReports: builder.query<UserReportsResponse, ListUserReportsQuery | void>({
      query: (params) =>
        params ? { url: "/safety/admin/reports", params } : "/safety/admin/reports",
      providesTags: ["Reports"],
    }),

    updateReportStatus: builder.mutation<
      UserReport,
      { reportId: string; body: UpdateReportStatusPayload }
    >({
      query: ({ reportId, body }) => ({
        url: `/safety/reports/${reportId}/status`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Reports", "Dashboard"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetReportsQuery, useUpdateReportStatusMutation } = reportsApi;
