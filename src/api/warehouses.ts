import { apiClient } from "./client";

export type WarehouseResponse = {
  warehouseId: number;
  warehouseName: string;
  location: string;
  managerId?: number;
  managerName?: string | null;
  inventoryRecords?: InventoryRecord[];
  createdDate?: string;
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
  reorderLevel: number;
  isLowStock: boolean;
  warehouseName?: string;
  material?: { materialName: string; unit: string };
  variantName?: string;
  rowVersion?: string;
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
};

export type InventoryAdjustmentRequest = {
  warehouseId: number;
  variantId: number;
  quantityDelta: number;
  note?: string;
  rowVersion?: string;
};

export type InventoryReturnRequest = {
  warehouseId: number;
  variantId: number;
  quantity: number;
  materialRequestId?: number;
  note?: string;
  rowVersion?: string;
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
      Math.max(0, (item.quantityOnHand ?? item.quantity ?? 0) - (item.reservedQuantity ?? 0)),
    reorderLevel: item.reorderLevel ?? 0,
    isLowStock:
      item.isLowStock ??
      (item.availableQuantity ?? item.quantity ?? item.quantityOnHand ?? 0) <=
        (item.reorderLevel ?? 0),
    warehouseName: item.warehouseName,
    variantName: item.variantName,
    rowVersion: item.rowVersion,
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
    const response = await apiClient.post<RawInventoryItem>(
      "/api/warehouses/inventory/adjust",
      body,
    );
    return {
      ...response,
      result: response.result ? normalizeInventoryItem(response.result, 0) : response.result,
    };
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
};
