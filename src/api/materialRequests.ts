import { apiClient } from "./client";

export type MaterialRequestItem = {
  materialId: number;
  quantity: number;
  neededByDate: string;
};

export type CreateMaterialRequestRequest = {
  projectId: number;
  taskId?: number;
  items: MaterialRequestItem[];
};

export type MaterialRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type MaterialRequestDetail = {
  itemId: number;
  materialId: number;
  materialName: string;
  unit?: string | null;
  quantity: number;
  neededByDate: string;
};

export type MaterialRequestResponse = {
  requestId: number;
  projectId: number;
  taskId?: number | null;
  requestedBy: number;
  requestedByName: string;
  requestDate: string;
  status: MaterialRequestStatus | string;
  items: MaterialRequestDetail[];
};

export const materialRequestsApi = {
  getAll: () => apiClient.get<MaterialRequestResponse[]>("/api/MaterialRequest"),
  getById: (requestId: number) =>
    apiClient.get<MaterialRequestResponse>(`/api/MaterialRequest/${requestId}`),
  getByProject: (projectId: number) =>
    apiClient.get<MaterialRequestResponse[]>(`/api/MaterialRequest/project/${projectId}`),
  create: (body: CreateMaterialRequestRequest) =>
    apiClient.post<string>("/api/MaterialRequest", body),
  createFromTask: (taskId: number) =>
    apiClient.post<MaterialRequestResponse>(`/api/MaterialRequest/task/${taskId}`),
  approve: (requestId: number) =>
    apiClient.put<string>(`/api/MaterialRequest/${requestId}/approve`),
  reject: (requestId: number) => apiClient.put<string>(`/api/MaterialRequest/${requestId}/reject`),
};
