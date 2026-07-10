import { apiClient } from "./client";
import type { ApiEnvelope } from "./client";

export type CategoryResponse = {
  id: number;
  categoryName: string;
  totalMaterials: number;
};

export type CategoryRequest = {
  categoryName: string;
};

const CATEGORY_ROUTE = "/api/Categories";
const LEGACY_CATEGORY_ROUTE = "/api/Category";

async function withCategoryFallback<T>(
  request: (route: string) => Promise<ApiEnvelope<T>>,
): Promise<ApiEnvelope<T>> {
  const response = await request(CATEGORY_ROUTE);
  if (response.statusCode !== 404) return response;
  return request(LEGACY_CATEGORY_ROUTE);
}

export const categoriesApi = {
  getAll: () => withCategoryFallback((route) => apiClient.get<CategoryResponse[]>(route)),
  getById: (id: number) =>
    withCategoryFallback((route) => apiClient.get<CategoryResponse>(`${route}/${id}`)),
  create: (body: CategoryRequest) =>
    withCategoryFallback((route) => apiClient.post<string>(route, body)),
  update: (id: number, body: CategoryRequest) =>
    withCategoryFallback((route) => apiClient.put<string>(`${route}/${id}`, body)),
  delete: (id: number) =>
    withCategoryFallback((route) => apiClient.delete<string>(`${route}/${id}`)),
};
