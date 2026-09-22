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
  // Transfer writes retired (HTTP 410) under the single-warehouse model:
  // create/approve/reject/ship/receive/cancel were removed. Reads remain for history.
};
