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

export type CatalogResponse = {
  catalogId: number;
  supplierId: number;
  supplierName: string;
  variantId: number;
  materialId: number;
  materialName: string;
  variantName: string;
  unit: string;
  supplierSku?: string | null;
  unitPrice: number;
  minimumOrderQuantity: number;
  leadTimeDays: number;
};

export const catalogsApi = {
  getAll: () => apiClient.get<CatalogResponse[]>("/api/catalogs"),
  create: (body: CreateCatalogRequest) => apiClient.post<string>("/api/catalogs", body),
};
