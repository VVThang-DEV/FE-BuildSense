 import { apiClient } from "./client";

export type MaterialResponse = {
  materialId: number;
  materialName: string;
  unit: string;
  categoryId: number;
};

export const materialsApi = {
  getAll: () => apiClient.get<MaterialResponse[]>("/api/materials"),
  create: (body: { materialName: string; unit: string; categoryId: number }) =>
    apiClient.post<string>("/api/materials", body),
};
