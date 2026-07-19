import { apiClient } from "./client";

export type CreateCatalogRequest = {
  supplierId: number;
  variantId: number;
  materialId: number;
  supplierSku?: string;
  unitPrice: number;
  minimumOrderQuantity: number;
  leadTimeDays: number;
  isAvailable: boolean;
};

export type CatalogOfferResponse = {
  catalogId: number;
  supplierId: number;
  supplierName: string;
  variantId: number;
  materialId: number;
  materialName: string;
  variantName: string;
  sku?: string | null;
  supplierSku?: string | null;
  unit: string;
  unitPrice: number;
  minimumOrderQuantity: number;
  leadTimeDays: number;
  isAvailable: boolean;
};

export type UpdateCatalogRequest = Omit<
  CreateCatalogRequest,
  "supplierId" | "variantId" | "materialId"
>;

export const catalogsApi = {
  create: (body: CreateCatalogRequest) => apiClient.post<string>("/api/catalogs", body),
  getAll: (filters?: { supplierId?: number; variantId?: number; availableOnly?: boolean }) => {
    const query = new URLSearchParams();
    if (filters?.supplierId) query.set("supplierId", String(filters.supplierId));
    if (filters?.variantId) query.set("variantId", String(filters.variantId));
    if (filters?.availableOnly !== undefined)
      query.set("availableOnly", String(filters.availableOnly));
    return apiClient.get<CatalogOfferResponse[]>(`/api/catalogs${query.size ? `?${query}` : ""}`);
  },
  getById: (catalogId: number) => apiClient.get<CatalogOfferResponse>(`/api/catalogs/${catalogId}`),
  update: (catalogId: number, body: UpdateCatalogRequest) =>
    apiClient.put<CatalogOfferResponse>(`/api/catalogs/${catalogId}`, body),
  deactivate: (catalogId: number) =>
    apiClient.delete<CatalogOfferResponse>(`/api/catalogs/${catalogId}`),
};
