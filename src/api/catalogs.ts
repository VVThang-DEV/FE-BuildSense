import { apiClient } from "./client";

export type CatalogResponse = {
  catalogId: number;
  categoryName: string;
};

export const catalogsApi = {
  create: (body: { categoryName: string }) =>
    apiClient.post<string>("/api/catalogs", body),
};
