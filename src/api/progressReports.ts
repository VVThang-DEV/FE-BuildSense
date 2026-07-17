import { apiClient } from "./client";

export type SubmitProgressReportRequest = {
  taskId: number;
  progressIncrement: number;
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
  notes?: string | null;
  sitePhotoUrl?: string | null;
};

export const progressReportsApi = {
  create: (body: SubmitProgressReportRequest) =>
    apiClient.post<string>("/api/ProgressReport", body),
  getByTask: (taskId: number) =>
    apiClient.get<ProgressReportResponse[]>(`/api/ProgressReport/task/${taskId}`),
};
