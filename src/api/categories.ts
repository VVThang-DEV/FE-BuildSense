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
  getAll: () => apiClient.get<CategoryResponse[]>("/api/categories"),
  getById: (id: number) => apiClient.get<CategoryResponse>(`/api/categories/${id}`),
  create: (body: CategoryRequest) => apiClient.post<string>("/api/categories", body),
  update: (id: number, body: CategoryRequest) =>
    apiClient.put<string>(`/api/categories/${id}`, body),
  delete: (id: number) => apiClient.delete<string>(`/api/categories/${id}`),
};
