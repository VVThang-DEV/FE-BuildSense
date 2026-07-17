import { apiClient } from "./client";

export type SubmitProgressReportRequest = {
  taskId: number;
  progressIncrement: number;
  actualCostIncrement: number;
  notes?: string;
  sitePhotoUrl?: string;
};

export type ProgressReportResponse = {
  reportId: number;
  taskId: number;
  taskName: string;
  reportedByUserId: number;
  reportedByName: string;
  reportDate: string;
  progressIncrement: number;
  actualCostIncrement: number;
  notes?: string | null;
  sitePhotoUrl?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CORRECTED" | "REVERSED";
  reviewedByUserId?: number | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  originalReportId?: number | null;
  rowVersion: string;
};

export type ReviewProgressReportRequest = {
  reviewNote?: string;
  allowCostOverrun?: boolean;
  rowVersion: string;
};

export type CorrectProgressReportRequest = Omit<SubmitProgressReportRequest, "taskId"> & {
  rowVersion: string;
};

export const progressReportsApi = {
  create: (body: SubmitProgressReportRequest) =>
    apiClient.post<{ reportId: number; status: string; message: string }>(
      "/api/ProgressReport",
      body,
    ),
  getByTask: (taskId: number) =>
    apiClient.get<ProgressReportResponse[]>(`/api/ProgressReport/task/${taskId}`),
  approve: (reportId: number, body: ReviewProgressReportRequest) =>
    apiClient.post(`/api/ProgressReport/${reportId}/approve`, body),
  reject: (reportId: number, body: ReviewProgressReportRequest) =>
    apiClient.post(`/api/ProgressReport/${reportId}/reject`, body),
  correct: (reportId: number, body: CorrectProgressReportRequest) =>
    apiClient.post(`/api/ProgressReport/${reportId}/correct`, body),
  reverse: (reportId: number, body: ReviewProgressReportRequest) =>
    apiClient.post(`/api/ProgressReport/${reportId}/reverse`, body),
};
