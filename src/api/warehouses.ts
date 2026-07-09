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
  materialId: number;
  quantity: number;
  reservedQuantity: number;
  reorderLevel: number;
  isLowStock: boolean;
  warehouseName?: string;
  material?: { materialName: string; unit: string };
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
  materialId: number;
  quantityOnHand: number;
  reservedQuantity: number;
  reorderLevel: number;
  updatedAt: string;
};

function normalizeInventoryItem(item: RawInventoryItem, index: number): InventoryItem {
  return {
    inventoryId: item.inventoryId ?? index,
    materialId: item.materialId ?? 0,
    quantity: item.quantity ?? item.availableQuantity ?? item.quantityOnHand ?? 0,
    reservedQuantity: item.reservedQuantity ?? 0,
    reorderLevel: item.reorderLevel ?? 0,
    isLowStock:
      item.isLowStock ??
      (item.availableQuantity ?? item.quantity ?? item.quantityOnHand ?? 0) <=
        (item.reorderLevel ?? 0),
    warehouseName: item.warehouseName,
    material: item.material ?? {
      materialName: item.materialName ?? "Unknown material",
      unit: item.unit ?? "",
    },
  };
}

export const warehousesApi = {
  getAll: () => apiClient.get<WarehouseResponse[]>("/api/warehouses"),
  create: (body: { warehouseName: string; location: string }) =>
    apiClient.post<string>("/api/warehouses", body),
  getInventory: async (id: number) => {
    const response = await apiClient.get<RawInventoryItem[]>(`/api/warehouses/${id}/inventory`);
    return {
      ...response,
      result: (response.result ?? []).map(normalizeInventoryItem),
    };
  },
};
