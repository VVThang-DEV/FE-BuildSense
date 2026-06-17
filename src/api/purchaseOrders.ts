import { apiClient } from "./client";

export type PurchaseOrderResponse = {
  poId: number;
  projectId: number;
  supplierId: number;
  userAccountId: number;
  totalAmount: number;
  orderDate: string;
  status: "PENDING" | "APPROVED" | "DELIVERED";
  deliveryDate: string | null;
};

export type CreatePurchaseOrderRequest = {
  projectId: number;
  supplierId: number;
  items: { materialId: number; quantity: number; unitPrice: number }[];
};

export const purchaseOrdersApi = {
  getAll:  () =>
    apiClient.get<PurchaseOrderResponse[]>("/api/purchaseorders"),
  create: (body: CreatePurchaseOrderRequest) =>
    apiClient.post<string>("/api/purchaseorders", body),
  approve: (id: number) =>
    apiClient.put<string>(`/api/purchaseorders/${id}/approve`),
  importToWarehouse: (poId: number, warehouseId: number) =>
    apiClient.post(`/api/purchaseorders/${poId}/import?warehouseId=${warehouseId}`),
};
