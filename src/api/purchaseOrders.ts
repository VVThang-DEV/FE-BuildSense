import { apiClient } from "./client";

type PurchaseOrderStatus = "PENDING" | "APPROVED" | "DELIVERED";

type RawPurchaseOrderResponse = Omit<Partial<PurchaseOrderResponse>, "status"> & {
  status?: PurchaseOrderStatus | number | string;
};

export type PurchaseOrderResponse = {
  poId: number;
  projectId: number;
  supplierId: number;
  userAccountId: number;
  totalAmount: number;
  orderDate: string;
  status: PurchaseOrderStatus;
  deliveryDate: string | null;
};

export type CreatePurchaseOrderRequest = {
  projectId: number;
  supplierId: number;
  items: { materialId: number; quantity: number; unitPrice: number }[];
};

const STATUS_BY_NUMBER: Record<number, PurchaseOrderStatus> = {
  0: "PENDING",
  1: "APPROVED",
  2: "DELIVERED",
};

function normalizeStatus(status: RawPurchaseOrderResponse["status"]): PurchaseOrderStatus {
  if (typeof status === "number") return STATUS_BY_NUMBER[status] ?? "PENDING";
  if (typeof status === "string") {
    const numeric = Number(status);
    if (Number.isInteger(numeric)) return STATUS_BY_NUMBER[numeric] ?? "PENDING";
    const upper = status.toUpperCase();
    if (upper === "APPROVED" || upper === "DELIVERED") return upper;
  }
  return "PENDING";
}

function normalizePurchaseOrder(po: RawPurchaseOrderResponse): PurchaseOrderResponse {
  return {
    poId: po.poId ?? 0,
    projectId: po.projectId ?? 0,
    supplierId: po.supplierId ?? 0,
    userAccountId: po.userAccountId ?? 0,
    totalAmount: po.totalAmount ?? 0,
    orderDate: po.orderDate ?? "",
    status: normalizeStatus(po.status),
    deliveryDate: po.deliveryDate ?? null,
  };
}

export const purchaseOrdersApi = {
  getAll:  async () => {
    const response = await apiClient.get<RawPurchaseOrderResponse[]>("/api/purchaseorders");
    return {
      ...response,
      result: (response.result ?? []).map(normalizePurchaseOrder),
    };
  },
  create: (body: CreatePurchaseOrderRequest) =>
    apiClient.post<string>("/api/purchaseorders", body),
  approve: (id: number) =>
    apiClient.put<string>(`/api/purchaseorders/${id}/approve`),
  importToWarehouse: (poId: number, warehouseId: number) =>
    apiClient.post(`/api/purchaseorders/${poId}/import?warehouseId=${warehouseId}`),
};
