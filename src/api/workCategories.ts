import { apiClient } from "./client";

// Global admin-managed lookup grouping phases.
// Reads need any authenticated user; writes are ADMIN-only.

export type WorkCategoryResponse = {
  workCategoryId: number;
  name: string;
  description?: string | null;
};

export type CreateWorkCategoryRequest = {
  name: string;
  description?: string;
};

export type UpdateWorkCategoryRequest = CreateWorkCategoryRequest;

export const workCategoriesApi = {
  getAll: () =>
    apiClient.get<WorkCategoryResponse[]>("/api/WorkCategories"),
  getById: (id: number) =>
    apiClient.get<WorkCategoryResponse>(`/api/WorkCategories/${id}`),
  /** ADMIN only. Name required (≤ 200 chars), unique. */
  create: (body: CreateWorkCategoryRequest) =>
    apiClient.post<WorkCategoryResponse>("/api/WorkCategories", body),
  /** ADMIN only. Same validation as create. */
  update: (id: number, body: UpdateWorkCategoryRequest) =>
    apiClient.put<WorkCategoryResponse>(`/api/WorkCategories/${id}`, body),
  /** ADMIN only. 409 while any phase still references the category. */
  remove: (id: number) => apiClient.delete<string>(`/api/WorkCategories/${id}`),
};
