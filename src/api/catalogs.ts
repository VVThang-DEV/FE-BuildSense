import { apiClient } from "./client";

export type CreateCatalogRequest = {
  supplierId: number;
  materialId: number;
  unitPrice: number;
  leadTimeDays: number;
};

export const catalogsApi = {
  create: (body: CreateCatalogRequest) => apiClient.post<string>("/api/catalogs", body),
};
