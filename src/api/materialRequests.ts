import { apiClient } from "./client";

export type MaterialRequestItem = {
  variantId?: number;
  materialId: number;
  quantity: number;
  neededByDate: string;
  note?: string;
};

export type CreateMaterialRequestRequest = {
  projectId: number;
  taskId?: number;
  warehouseId?: number;
  requestNote?: string;
  items: MaterialRequestItem[];
};

export type MaterialRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "PARTIALLY_APPROVED"
  | "REJECTED"
  | "ISSUED"
  | "PARTIALLY_ISSUED"
  | "RELEASED"
  | "CANCELLED";

export type MaterialRequestDetail = {
  itemId: number;
  variantId: number;
  materialId: number;
  materialName: string;
  variantName: string;
  sku?: string | null;
  unit?: string | null;
  quantity: number;
  approvedQuantity: number;
  issuedQuantity: number;
  returnedQuantity: number;
  netIssuedQuantity: number;
  remainingRequestQuantity: number;
  remainingTaskDemand: number;
  neededByDate: string;
  note?: string | null;
};

export type MaterialRequestResponse = {
  requestId: number;
  projectId: number;
  taskId?: number | null;
  warehouseId?: number | null;
  warehouseName?: string | null;
  requestedBy: number;
  requestedByName: string;
  requestDate: string;
  status: MaterialRequestStatus;
  requestNote?: string | null;
  approvedByUserId?: number | null;
  approvedAt?: string | null;
  decisionNote?: string | null;
  rowVersion: string;
  items: MaterialRequestDetail[];
};

export type ApproveMaterialRequest = {
  warehouseId: number;
  decisionNote?: string;
  items: { itemId: number; approvedQuantity: number }[];
};

export type UpdatePendingMaterialRequest = {
  rowVersion: string;
  requestNote?: string;
  items: {
    itemId: number;
    quantity: number;
    neededByDate: string;
    note?: string;
  }[];
};

export const materialRequestsApi = {
  getAll: () => apiClient.get<MaterialRequestResponse[]>("/api/MaterialRequest"),
  getById: (requestId: number) =>
    apiClient.get<MaterialRequestResponse>(`/api/MaterialRequest/${requestId}`),
  getByProject: (projectId: number) =>
    apiClient.get<MaterialRequestResponse[]>(`/api/MaterialRequest/project/${projectId}`),
  create: (body: CreateMaterialRequestRequest) =>
    apiClient.post<MaterialRequestResponse>("/api/MaterialRequest", body),
  createFromTask: (taskId: number) =>
    apiClient.post<MaterialRequestResponse>(`/api/MaterialRequest/task/${taskId}`),
  approve: (requestId: number, body: ApproveMaterialRequest) =>
    apiClient.put<MaterialRequestResponse>(`/api/MaterialRequest/${requestId}/approve`, body),
  reject: (requestId: number, decisionNote?: string) =>
    apiClient.put<MaterialRequestResponse>(`/api/MaterialRequest/${requestId}/reject`, {
      decisionNote,
    }),
  issue: (requestId: number) =>
    apiClient.put<MaterialRequestResponse>(`/api/MaterialRequest/${requestId}/issue`),
  release: (requestId: number) =>
    apiClient.put<MaterialRequestResponse>(`/api/MaterialRequest/${requestId}/release`),
  updatePending: (requestId: number, body: UpdatePendingMaterialRequest) =>
    apiClient.put<MaterialRequestResponse>(`/api/MaterialRequest/${requestId}`, body),
  cancelPending: (requestId: number, rowVersion: string, reason?: string) =>
    apiClient.put<MaterialRequestResponse>(`/api/MaterialRequest/${requestId}/cancel`, {
      rowVersion,
      reason,
    }),
};
