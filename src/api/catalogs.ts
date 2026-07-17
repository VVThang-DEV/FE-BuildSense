import { apiClient } from "./client";

export type CreateCatalogRequest = {
  supplierId: number;
  variantId: number;
  supplierSku?: string;
  unitPrice: number;
  minimumOrderQuantity: number;
  leadTimeDays: number;
  isAvailable: boolean;
};

export const catalogsApi = {
  create: (body: CreateCatalogRequest) => apiClient.post<string>("/api/catalogs", body),
};
