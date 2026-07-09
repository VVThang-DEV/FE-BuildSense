import { apiClient } from "./client";

export type MaterialRequestItem = {
  materialId: number;
  quantity: number;
  neededByDate: string;
};

export type CreateMaterialRequestRequest = {
  projectId: number;
  items: MaterialRequestItem[];
};

export const materialRequestsApi = {
  create: (body: CreateMaterialRequestRequest) =>
    apiClient.post<string>("/api/MaterialRequest", body),
  approve: (requestId: number) =>
    apiClient.put<string>(`/api/MaterialRequest/${requestId}/approve`),
  reject: (requestId: number) => apiClient.put<string>(`/api/MaterialRequest/${requestId}/reject`),
};
