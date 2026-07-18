import { apiClient } from "./client";

export type PurchaseOrderStatus =
  | "PENDING"
  | "APPROVED"
  | "PROCESSING"
  | "SHIPPED"
  | "PARTIALLY_RECEIVED"
  | "REJECTED"
  | "DELIVERED"
  | "CLOSED_WITH_VARIANCE"
  | "CANCELLED";

type RawPurchaseOrderResponse = Omit<Partial<PurchaseOrderResponse>, "status"> & {
  status?: PurchaseOrderStatus | number | string;
  project?: { projectId?: number; projectName?: string } | null;
  supplier?: { supplierId?: number; supplierName?: string | null } | null;
  expectedDeliveryDate?: string | null;
};

export type PurchaseOrderItem = {
  orderLineItemId: number;
  variantId: number;
  materialId: number;
  requestItemId?: number | null;
  materialName: string;
  variantName: string;
  unit: string;
  quantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  missingQuantity: number;
  unitPrice: number;
  subTotal: number;
};

export type PurchaseOrderResponse = {
  poId: number;
  projectId: number;
  projectName: string;
  supplierId: number;
  supplierName: string;
  warehouseId: number;
  warehouseName: string;
  totalAmount: number;
  orderDate: string;
  status: PurchaseOrderStatus;
  expectedDeliveryDate: string | null;
  approvedByUserId?: number | null;
  approvedAt?: string | null;
  note?: string | null;
  rowVersion: string;
  currency: string;
  items: PurchaseOrderItem[];
};

export type CreatePurchaseOrderRequest = {
  projectId: number;
  supplierId: number;
  warehouseId: number;
  expectedDeliveryDate?: string;
  note?: string;
  items: {
    variantId?: number;
    materialId: number;
    requestItemId?: number;
    quantity: number;
    unitPrice: number;
  }[];
};

export type ReceivePurchaseOrderRequest = {
  note?: string;
  isFinalDelivery: boolean;
  items: {
    lineItemId: number;
    quantity: number;
    damagedQuantity: number;
    missingQuantity: number;
    lotNumber?: string;
    batchNumber?: string;
    serialNumber?: string;
    expiryDate?: string;
  }[];
};

export type PurchaseOrderBudgetError = {
  message?: string;
  totalBudget?: number;
  usedBudget?: number;
  remainingBudget?: number;
  currentOrder?: number;
  currency?: string;
};

const STATUS_BY_NUMBER: Record<number, PurchaseOrderStatus> = {
  0: "PENDING",
  1: "APPROVED",
  2: "PROCESSING",
  3: "SHIPPED",
  4: "PARTIALLY_RECEIVED",
  5: "REJECTED",
  6: "DELIVERED",
  7: "CLOSED_WITH_VARIANCE",
  8: "CANCELLED",
};

function normalizeStatus(status: RawPurchaseOrderResponse["status"]): PurchaseOrderStatus {
  if (typeof status === "number") return STATUS_BY_NUMBER[status] ?? "PENDING";
  if (typeof status === "string") {
    const numeric = Number(status);
    if (Number.isInteger(numeric)) return STATUS_BY_NUMBER[numeric] ?? "PENDING";
    const upper = status.toUpperCase();
    if (
      upper === "APPROVED" ||
      upper === "PROCESSING" ||
      upper === "SHIPPED" ||
      upper === "PARTIALLY_RECEIVED" ||
      upper === "REJECTED" ||
      upper === "DELIVERED" ||
      upper === "CLOSED_WITH_VARIANCE" ||
      upper === "CANCELLED"
    )
      return upper;
  }
  return "PENDING";
}

function normalizePurchaseOrder(po: RawPurchaseOrderResponse): PurchaseOrderResponse {
  return {
    poId: po.poId ?? 0,
    projectId: po.projectId ?? po.project?.projectId ?? 0,
    projectName: po.projectName ?? po.project?.projectName ?? "",
    supplierId: po.supplierId ?? po.supplier?.supplierId ?? 0,
    supplierName: po.supplierName ?? po.supplier?.supplierName ?? "",
    warehouseId: po.warehouseId ?? 0,
    warehouseName: po.warehouseName ?? "",
    totalAmount: po.totalAmount ?? 0,
    orderDate: po.orderDate ?? "",
    status: normalizeStatus(po.status),
    expectedDeliveryDate: po.expectedDeliveryDate ?? null,
    approvedByUserId: po.approvedByUserId ?? null,
    approvedAt: po.approvedAt ?? null,
    note: po.note ?? null,
    rowVersion: po.rowVersion ?? "",
    currency: po.currency ?? "VND",
    items: (po.items ?? []).map((item) => ({
      orderLineItemId: item.orderLineItemId ?? 0,
      variantId: item.variantId ?? 0,
      materialId: item.materialId ?? 0,
      requestItemId: item.requestItemId ?? null,
      materialName: item.materialName ?? "Unknown material",
      variantName: item.variantName ?? "",
      unit: item.unit ?? "",
      quantity: Number(item.quantity ?? 0),
      receivedQuantity: Number(item.receivedQuantity ?? 0),
      damagedQuantity: Number(item.damagedQuantity ?? 0),
      missingQuantity: Number(item.missingQuantity ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
      subTotal: Number(item.subTotal ?? Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)),
    })),
  };
}

export const purchaseOrdersApi = {
  getAll: async () => {
    const response = await apiClient.get<RawPurchaseOrderResponse[]>("/api/purchaseorders");
    return {
      ...response,
      result: (response.result ?? []).map(normalizePurchaseOrder),
    };
  },
  create: (body: CreatePurchaseOrderRequest) =>
    apiClient.post<PurchaseOrderResponse | PurchaseOrderBudgetError | string>(
      "/api/purchaseorders",
      body,
    ),
  createFromShortages: (body: CreatePurchaseOrderRequest) =>
    apiClient.post<PurchaseOrderResponse | PurchaseOrderBudgetError | string>(
      "/api/purchaseorders/from-shortages",
      body,
    ),
  approve: (id: number) =>
    apiClient.put<PurchaseOrderResponse>(`/api/purchaseorders/${id}/approve`),
  reject: (id: number) => apiClient.put<PurchaseOrderResponse>(`/api/purchaseorders/${id}/reject`),
  receive: (poId: number, body: ReceivePurchaseOrderRequest) =>
    apiClient.post<PurchaseOrderResponse>(`/api/purchaseorders/${poId}/receive`, body),
  ship: (poId: number) => apiClient.post<string>(`/api/purchaseorders/${poId}/ship`),
  cancel: (poId: number) => apiClient.post<string>(`/api/purchaseorders/${poId}/cancel`),
};
