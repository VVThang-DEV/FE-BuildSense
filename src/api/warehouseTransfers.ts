import { apiClient } from "./client";

export type WarehouseTransferStatus =
  | "REQUESTED"
  | "APPROVED"
  | "IN_TRANSIT"
  | "RECEIVED"
  | "CLOSED_WITH_VARIANCE"
  | "REJECTED"
  | "CANCELLED";

export type WarehouseTransferItem = {
  transferItemId: number;
  variantId: number;
  materialId: number;
  materialName: string;
  variantName: string;
  unit: string;
  requestedQuantity: number;
  shippedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
  unitCost: number;
};

export type WarehouseTransferResponse = {
  transferId: number;
  sourceWarehouseId: number;
  sourceWarehouseName: string;
  destinationWarehouseId: number;
  destinationWarehouseName: string;
  status: WarehouseTransferStatus;
  requestedByUserId: number;
  approvedByUserId?: number | null;
  shippedByUserId?: number | null;
  receivedByUserId?: number | null;
  requestedAt: string;
  approvedAt?: string | null;
  shippedAt?: string | null;
  receivedAt?: string | null;
  note?: string | null;
  rowVersion: string;
  items: WarehouseTransferItem[];
};

export type CreateWarehouseTransferRequest = {
  sourceWarehouseId: number;
  destinationWarehouseId: number;
  note?: string;
  items: { variantId: number; quantity: number }[];
};

export const warehouseTransfersApi = {
  getAll: () => apiClient.get<WarehouseTransferResponse[]>("/api/WarehouseTransfers"),
  getById: (id: number) =>
    apiClient.get<WarehouseTransferResponse>(`/api/WarehouseTransfers/${id}`),
  create: (body: CreateWarehouseTransferRequest) =>
    apiClient.post<WarehouseTransferResponse>("/api/WarehouseTransfers", body),
  approve: (id: number) =>
    apiClient.put<WarehouseTransferResponse>(`/api/WarehouseTransfers/${id}/approve`),
  reject: (id: number) =>
    apiClient.put<WarehouseTransferResponse>(`/api/WarehouseTransfers/${id}/reject`),
  ship: (id: number) =>
    apiClient.post<WarehouseTransferResponse>(`/api/WarehouseTransfers/${id}/ship`),
  receive: (
    id: number,
    items?: {
      transferItemId: number;
      quantity: number;
      damagedQuantity: number;
      lostQuantity: number;
    }[],
  ) =>
    apiClient.post<WarehouseTransferResponse>(
      `/api/WarehouseTransfers/${id}/receive`,
      items ? { items } : undefined,
    ),
  cancel: (id: number) =>
    apiClient.put<WarehouseTransferResponse>(`/api/WarehouseTransfers/${id}/cancel`),
};
