import { apiClient } from "./client";

export type PhaseStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type CreatePhaseRequest = {
  name: string;
  description?: string;
  sequenceOrder: number;
  baselineStart: string;
  baselineEnd: string;
  /** Required — must reference an existing work category. */
  workCategoryId: number;
};

export type UpdatePhaseRequest = CreatePhaseRequest & {
  rowVersion: string;
};

export type PhaseLifecycleRequest = {
  rowVersion: string;
};

export type PhaseResponse = {
  phaseId: number;
  projectId: number;
  workCategoryId: number;
  workCategoryName?: string | null;
  name: string;
  description?: string | null;
  sequenceOrder: number;
  baselineStart: string;
  baselineEnd: string;
  status: PhaseStatus;
  createdDate: string;
  rowVersion: string;
};

export const phasesApi = {
  create: (projectId: number, body: CreatePhaseRequest) =>
    apiClient.post<PhaseResponse>(`/api/Projects/${projectId}/phases`, body),
  listByProject: (projectId: number) =>
    apiClient.get<PhaseResponse[]>(`/api/Projects/${projectId}/phases`),
  getById: (phaseId: number) => apiClient.get<PhaseResponse>(`/api/Phases/${phaseId}`),
  update: (phaseId: number, body: UpdatePhaseRequest) =>
    apiClient.put<PhaseResponse>(`/api/Phases/${phaseId}`, body),
  cancel: (phaseId: number, body: PhaseLifecycleRequest) =>
    apiClient.post<{ phaseId: number; status: PhaseStatus; rowVersion: string }>(
      `/api/Phases/${phaseId}/cancel`,
      body,
    ),
};
