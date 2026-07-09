import { apiClient } from "./client";

export type CategoryResponse = {
  id: number;
  categoryName: string;
  totalMaterials: number;
};

export type CategoryRequest = {
  categoryName: string;
};

export const categoriesApi = {
  getAll: () => apiClient.get<CategoryResponse[]>("/api/Category"),
  getById: (id: number) => apiClient.get<CategoryResponse>(`/api/Category/${id}`),
  create: (body: CategoryRequest) => apiClient.post<string>("/api/Category", body),
  update: (id: number, body: CategoryRequest) => apiClient.put<string>(`/api/Category/${id}`, body),
  delete: (id: number) => apiClient.delete<string>(`/api/Category/${id}`),
};
