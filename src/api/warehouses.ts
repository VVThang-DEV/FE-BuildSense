import { apiClient } from "./client";

export type WarehouseResponse = {
  warehouseId: number;
  warehouseName: string;
  location: string;
};

export type InventoryItem = {
  inventoryId: number;
  materialId: number;
  quantity: number;
  material?: { materialName: string; unit: string };
};

type RawInventoryItem = Partial<InventoryItem> & {
  materialName?: string;
  unit?: string;
};

function normalizeInventoryItem(item: RawInventoryItem, index: number): InventoryItem {
  return {
    inventoryId: item.inventoryId ?? index,
    materialId: item.materialId ?? 0,
    quantity: item.quantity ?? 0,
    material: item.material ?? {
      materialName: item.materialName ?? "Unknown material",
      unit: item.unit ?? "",
    },
  };
}

export const warehousesApi = {
  getAll:       () =>
    apiClient.get<WarehouseResponse[]>("/api/warehouses"),
  create:       (body: { warehouseName: string; location: string }) =>
    apiClient.post<string>("/api/warehouses", body),
  getInventory: async (id: number) => {
    const response = await apiClient.get<RawInventoryItem[]>(`/api/warehouses/${id}/inventory`);
    return {
      ...response,
      result: (response.result ?? []).map(normalizeInventoryItem),
    };
  },
};
