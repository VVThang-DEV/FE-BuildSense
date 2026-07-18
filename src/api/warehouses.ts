import { apiClient } from "./client";

export type WarehouseResponse = {
  warehouseId: number;
  warehouseName: string;
  location: string;
  managerId?: number;
  managerName?: string | null;
  inventoryRecords?: InventoryRecord[];
  createdDate?: string;
  modifiedDate?: string | null;
  createdBy?: number | null;
  modifiedBy?: number | null;
  isDeleted?: boolean;
};

export type InventoryItem = {
  inventoryId: number;
  warehouseId: number;
  variantId: number;
  materialId: number;
  quantity: number;
  reservedQuantity: number;
  onOrderQuantity: number;
  availableQuantity: number;
  quarantineQuantity: number;
  averageUnitCost: number;
  inventoryValue: number;
  reorderLevel: number;
  isLowStock: boolean;
  warehouseName?: string;
  material?: { materialName: string; unit: string };
  variantName?: string;
  rowVersion?: string;
  updatedAt?: string;
};

type RawInventoryItem = Partial<InventoryItem> & {
  quantityOnHand?: number;
  availableQuantity?: number;
  reservedQuantity?: number;
  reorderLevel?: number;
  isLowStock?: boolean;
  materialName?: string;
  warehouseName?: string;
  unit?: string;
};

export type InventoryRecord = {
  inventoryId: number;
  variantId: number;
  quantityOnHand: number;
  reservedQuantity: number;
  onOrderQuantity: number;
  reorderLevel: number;
  updatedAt: string;
};

export type InventoryTransactionResponse = {
  transactionId: number;
  warehouseId: number;
  variantId: number;
  transactionType: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceId?: number | null;
  referenceType?: string | null;
  note?: string | null;
  performedByUserId: number;
  transactionDate: string;
  unitCost?: number | null;
  totalValue?: number | null;
  lotNumber?: string | null;
  batchNumber?: string | null;
  serialNumber?: string | null;
  expiryDate?: string | null;
};

export type InventoryAdjustmentReason =
  | "CYCLE_COUNT"
  | "DAMAGE"
  | "LOSS"
  | "DATA_CORRECTION"
  | "OPENING_BALANCE";

export type InventoryAdjustmentRequest = {
  warehouseId: number;
  variantId: number;
  quantityDelta: number;
  reasonCode: InventoryAdjustmentReason;
  note?: string;
  rowVersion?: string;
};

export type InventoryReturnRequest = {
  warehouseId: number;
  variantId: number;
  quantity: number;
  materialRequestId: number;
  reasonCode: "UNUSED" | "EXCESS_ISSUE" | "DAMAGED";
  condition: "USABLE" | "QUARANTINED";
  note?: string;
  rowVersion?: string;
};

export type InventoryAdjustmentResponse = {
  adjustmentId: number;
  warehouseId?: number;
  variantId?: number;
  quantityDelta?: number;
  reasonCode?: InventoryAdjustmentReason;
  note?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedByUserId?: number;
  reviewedByUserId?: number | null;
  requestedAt?: string;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  rowVersion: string;
};

export type PhysicalCountResponse = {
  sessionId: number;
  warehouseId: number;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  startedAt: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  note?: string | null;
  reviewNote?: string | null;
  rowVersion: string;
  lines: {
    lineId: number;
    variantId: number;
    expectedQuantity: number;
    actualQuantity?: number | null;
    varianceQuantity: number;
  }[];
};

export type PhysicalCountMutationResponse = {
  sessionId: number;
  status: PhysicalCountResponse["status"];
  lineCount?: number;
  rowVersion: string;
};

function normalizeInventoryItem(item: RawInventoryItem, index: number): InventoryItem {
  return {
    inventoryId: item.inventoryId ?? index,
    warehouseId: item.warehouseId ?? 0,
    variantId: item.variantId ?? 0,
    materialId: item.materialId ?? 0,
    quantity: item.quantity ?? item.quantityOnHand ?? 0,
    reservedQuantity: item.reservedQuantity ?? 0,
    onOrderQuantity: item.onOrderQuantity ?? 0,
    availableQuantity:
      item.availableQuantity ??
      Math.max(
        0,
        (item.quantityOnHand ?? item.quantity ?? 0) -
          (item.reservedQuantity ?? 0) -
          (item.quarantineQuantity ?? 0),
      ),
    quarantineQuantity: item.quarantineQuantity ?? 0,
    averageUnitCost: item.averageUnitCost ?? 0,
    inventoryValue: item.inventoryValue ?? 0,
    reorderLevel: item.reorderLevel ?? 0,
    isLowStock:
      item.isLowStock ??
      (item.availableQuantity ?? item.quantity ?? item.quantityOnHand ?? 0) <=
        (item.reorderLevel ?? 0),
    warehouseName: item.warehouseName,
    variantName: item.variantName,
    rowVersion: item.rowVersion,
    updatedAt: item.updatedAt,
    material: item.material ?? {
      materialName: item.materialName ?? "Unknown material",
      unit: item.unit ?? "",
    },
  };
}

export const warehousesApi = {
  getAll: () => apiClient.get<WarehouseResponse[]>("/api/warehouses"),
  create: (body: { managerId: number; warehouseName: string; location: string }) =>
    apiClient.post<string>("/api/warehouses", body),
  getInventory: async (id: number) => {
    const response = await apiClient.get<RawInventoryItem[]>(`/api/warehouses/${id}/inventory`);
    return {
      ...response,
      result: (response.result ?? []).map(normalizeInventoryItem),
    };
  },
  adjustInventory: async (body: InventoryAdjustmentRequest) => {
    return apiClient.post<InventoryAdjustmentResponse>("/api/warehouses/inventory/adjust", body);
  },
  returnInventory: async (body: InventoryReturnRequest) => {
    const response = await apiClient.post<RawInventoryItem>(
      "/api/warehouses/inventory/return",
      body,
    );
    return {
      ...response,
      result: response.result ? normalizeInventoryItem(response.result, 0) : response.result,
    };
  },
  getTransactions: (warehouseId?: number, variantId?: number) => {
    const query = new URLSearchParams();
    if (warehouseId) query.set("warehouseId", String(warehouseId));
    if (variantId) query.set("variantId", String(variantId));
    return apiClient.get<InventoryTransactionResponse[]>(
      `/api/warehouses/inventory/transactions${query.size ? `?${query}` : ""}`,
    );
  },
  getAdjustments: (status?: string) =>
    apiClient.get<InventoryAdjustmentResponse[]>(
      `/api/warehouses/inventory/adjustments${status ? `?status=${encodeURIComponent(status)}` : ""}`,
    ),
  reviewAdjustment: (
    adjustmentId: number,
    approve: boolean,
    rowVersion: string,
    reviewNote?: string,
  ) =>
    apiClient.post(
      `/api/warehouses/inventory/adjustments/${adjustmentId}/${approve ? "approve" : "reject"}`,
      { rowVersion, reviewNote },
    ),
  startPhysicalCount: (warehouseId: number, variantIds: number[], note?: string) =>
    apiClient.post<PhysicalCountMutationResponse>("/api/warehouses/physical-counts", {
      warehouseId,
      variantIds,
      note,
    }),
  submitPhysicalCount: (
    sessionId: number,
    rowVersion: string,
    lines: { lineId: number; actualQuantity: number }[],
  ) =>
    apiClient.post<PhysicalCountMutationResponse>(
      `/api/warehouses/physical-counts/${sessionId}/submit`,
      {
        rowVersion,
        lines,
      },
    ),
  reviewPhysicalCount: (
    sessionId: number,
    approve: boolean,
    rowVersion: string,
    reviewNote?: string,
  ) =>
    apiClient.post(
      `/api/warehouses/physical-counts/${sessionId}/${approve ? "approve" : "reject"}`,
      { rowVersion, reviewNote },
    ),
  getPhysicalCounts: (warehouseId?: number, status?: string) => {
    const query = new URLSearchParams();
    if (warehouseId) query.set("warehouseId", String(warehouseId));
    if (status) query.set("status", status);
    return apiClient.get<PhysicalCountResponse[]>(
      `/api/warehouses/physical-counts${query.size ? `?${query}` : ""}`,
    );
  },
};
