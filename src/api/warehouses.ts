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

export const warehousesApi = {
  getAll:       () =>
    apiClient.get<WarehouseResponse[]>("/api/warehouses"),
  create:       (body: { warehouseName: string; location: string }) =>
    apiClient.post<string>("/api/warehouses", body),
  getInventory: (id: number) =>
    apiClient.get<InventoryItem[]>(`/api/warehouses/${id}/inventory`),
};
