import { apiClient } from "./client";

export type CategoryResponse = {
  id: number;
  categoryName: string;
  totalMaterials: number;
};

export type CategoryRequest = {
  categoryName: string;
};

const CATEGORY_ROUTE = "/api/Categories";

export const categoriesApi = {
  getAll: () => apiClient.get<CategoryResponse[]>(CATEGORY_ROUTE),
  getById: (id: number) => apiClient.get<CategoryResponse>(`${CATEGORY_ROUTE}/${id}`),
  create: (body: CategoryRequest) => apiClient.post<string>(CATEGORY_ROUTE, body),
  update: (id: number, body: CategoryRequest) =>
    apiClient.put<string>(`${CATEGORY_ROUTE}/${id}`, body),
  delete: (id: number) => apiClient.delete<string>(`${CATEGORY_ROUTE}/${id}`),
};
