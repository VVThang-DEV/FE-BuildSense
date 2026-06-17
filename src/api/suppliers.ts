import { apiClient } from "./client";

export type SupplierResponse = {
  supplierId: number;
  companyName: string;
  contactEmail: string | null;
  contactPhone: string | null;
};

export const suppliersApi = {
  getAll: () => apiClient.get<SupplierResponse[]>("/api/suppliers"),
  create: (body: { companyName: string; contactEmail?: string; contactPhone?: string }) =>
    apiClient.post<string>("/api/suppliers", body),
};
