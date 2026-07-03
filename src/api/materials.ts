import { apiClient } from "./client";

export type MaterialResponse = {
  materialId: number;
  materialName: string;
  unit: string;
  categoryId: number;
};

export const materialsApi = {
  getAll: () => apiClient.get<MaterialResponse[]>("/api/materials"),
  getById: (id: number) => apiClient.get<MaterialResponse>(`/api/materials/${id}`),
  create: (body: { materialName: string; unit: string; categoryId: number }) =>
    apiClient.post<string>("/api/materials", body),
  update: (id: number, body: { materialName: string; unit: string }) =>
    apiClient.put<string>(`/api/materials/${id}`, body),
  delete: (id: number) => apiClient.delete<string>(`/api/materials/${id}`),
};
