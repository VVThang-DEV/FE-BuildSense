import { apiClient } from "./client";
import type { AiProposedPhase, AiProposedTask } from "./aiPlanning";

export type ProjectStatus =
  | "PLANNING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DELAYED"
  | "PAUSED"
  | "CANCELLED";

type RawProjectResponse = Omit<Partial<ProjectResponse>, "status"> & {
  baselineStart?: string;
  customerUserID?: number | null;
  customerUserId?: number | null;
  customerId?: number | null;
  customerName?: string | null;
  status?: ProjectStatus | number | string;
};

export type ProjectResponse = {
  projectId: number;
  projectName: string;
  address: string | null;
  startDate: string;
  baselineStart: string;
  baselineEnd: string;
  totalProjectBudget: number;
  budgetConfigured: boolean;
  actualCost: number;
  plannedTaskBudget: number;
  reportedTaskActualCost: number;
  purchaseOrderCommittedCost: number;
  purchaseOrderReceivedCost: number;
  remainingProcurementBudget: number;
  currency: string;
  pmUserID: number;
  pmName: string;
  customerUserID: number | null;
  customerName: string | null;
  totalTasks: number;
  totalAIAlerts: number;
  status: ProjectStatus;
  createdDate: string;
  rowVersion: string;
};

export type CreateProjectRequest = {
  projectName: string;
  address?: string;
  totalProjectBudget: number;
  startDate: string;
  pmUserID: number;
  baselineStart: string;
  baselineEnd: string;
  customerUserId?: number;
};

export type ProjectMaterialRequirement = {
  variantId: number;
  materialId: number;
  materialName: string;
  variantName?: string | null;
  taskName?: string | null;
  grossQuantityRequired: number;
  unit: string;
};

export type MRPCalculationResponse = {
  variantId: number;
  warehouseId?: number | null;
  inventoryScope: "WAREHOUSE" | "ALL_WAREHOUSES" | string;
  materialId: number;
  materialName: string;
  variantName: string;
  unit: string;
  totalGrossRequired: number;
  issuedToProjectTasks: number;
  remainingGrossRequired: number;
  currentInventory: number;
  reservedQuantity: number;
  availableQuantity: number;
  onOrderQuantity: number;
  netQuantityRequired: number;
  earliestStartDate: string;
  planningRunId: number;
  planningVersion: number;
  transferRecommendations: MRPTransferRecommendation[];
};

export type MRPTransferRecommendation = {
  sourceWarehouseId: number;
  destinationWarehouseId: number;
  variantId: number;
  suggestedQuantity: number;
};

export type UpdateProjectRequest = {
  projectName: string;
  address?: string;
  startDate: string;
  baselineStart: string;
  baselineEnd: string;
  rowVersion: string;
};

export type AdjustProjectBudgetRequest = {
  projectId: number;
  amount: number;
  reason: string;
};

export type AiImportDraftProject = {
  projectName?: string;
  address?: string | null;
  totalProjectBudget?: number;
  startDate?: string;
  baselineStart?: string;
  baselineEnd?: string;
  [key: string]: unknown;
};

/**
 * AI-extracted project + phase/task draft preview from a Word file.
 * Persists nothing. Flow: review → create the project normally →
 * `confirm` the preview against the created project.
 */
export type AiImportPreviewResponse = {
  project?: AiImportDraftProject | null;
  /** Plan preview; also accepted at the top level for backend variants. */
  plan?: unknown;
  phases?: unknown;
  tasks?: unknown;
  warnings?: string[];
  [key: string]: unknown;
};

export type AiImportPlanPreview = {
  phases: AiProposedPhase[];
  tasks?: AiProposedTask[];
  warnings: string[];
};

export type ProjectBudgetHistoryResponse = {
  id: number;
  projectId: number;
  amountChanged: number;
  previousBudget: number;
  newBudget: number;
  currency: string;
  reason: string;
  updatedByUserId: number;
  createdAt: string;
};

const STATUS_BY_NUMBER: Record<number, ProjectStatus> = {
  0: "PLANNING",
  1: "IN_PROGRESS",
  2: "COMPLETED",
  3: "DELAYED",
  4: "PAUSED",
  5: "CANCELLED",
};

function normalizeStatus(status: RawProjectResponse["status"]): ProjectStatus {
  if (typeof status === "number") return STATUS_BY_NUMBER[status] ?? "PLANNING";
  if (typeof status === "string") {
    const numeric = Number(status);
    if (Number.isInteger(numeric)) return STATUS_BY_NUMBER[numeric] ?? "PLANNING";
    const upper = status.toUpperCase();
    if (
      upper === "IN_PROGRESS" ||
      upper === "COMPLETED" ||
      upper === "DELAYED" ||
      upper === "PAUSED" ||
      upper === "CANCELLED"
    )
      return upper;
  }
  return "PLANNING";
}

function normalizeDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getFullYear() <= 1901 ? "" : value;
}

function normalizeProject(project: RawProjectResponse): ProjectResponse {
  return {
    projectId: project.projectId ?? 0,
    projectName: project.projectName ?? "Untitled project",
    address: project.address ?? null,
    startDate: normalizeDate(project.startDate ?? project.baselineStart),
    baselineStart: normalizeDate(project.baselineStart),
    baselineEnd: normalizeDate(project.baselineEnd),
    totalProjectBudget: project.totalProjectBudget ?? 0,
    budgetConfigured: project.budgetConfigured ?? false,
    actualCost: project.actualCost ?? 0,
    plannedTaskBudget: project.plannedTaskBudget ?? 0,
    reportedTaskActualCost: project.reportedTaskActualCost ?? 0,
    purchaseOrderCommittedCost: project.purchaseOrderCommittedCost ?? 0,
    purchaseOrderReceivedCost: project.purchaseOrderReceivedCost ?? 0,
    remainingProcurementBudget: project.remainingProcurementBudget ?? 0,
    currency: project.currency ?? "VND",
    pmUserID: project.pmUserID ?? 0,
    pmName: project.pmName ?? "",
    customerUserID: project.customerUserID ?? project.customerUserId ?? project.customerId ?? null,
    customerName: project.customerName ?? null,
    totalTasks: project.totalTasks ?? 0,
    totalAIAlerts: project.totalAIAlerts ?? 0,
    status: normalizeStatus(project.status),
    createdDate: normalizeDate(project.createdDate),
    rowVersion: project.rowVersion ?? "",
  };
}

export const projectsApi = {
  getAll: async () => {
    const response = await apiClient.get<RawProjectResponse[]>("/api/projects");
    return {
      ...response,
      result: (response.result ?? []).map(normalizeProject),
    };
  },
  getById: async (id: number) => {
    const response = await apiClient.get<RawProjectResponse>(`/api/projects/${id}`);
    return {
      ...response,
      result: response.result ? normalizeProject(response.result) : response.result,
    };
  },
  create: async (body: CreateProjectRequest) => {
    const response = await apiClient.post<RawProjectResponse | string>("/api/projects", body);
    return {
      ...response,
      result:
        response.isSuccess && typeof response.result === "object" && response.result !== null
          ? normalizeProject(response.result)
          : response.result,
    };
  },
  importFromWordAi: async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiClient.postForm<AiImportPreviewResponse>(
      "/api/projects/import-word-ai",
      body,
    );
  },
  importFromWord: async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    const response = await apiClient.postForm<RawProjectResponse>(
      "/api/projects/import-word",
      body,
    );
    return {
      ...response,
      result: response.result ? normalizeProject(response.result) : response.result,
    };
  },
  getMaterialRequirements: (projectId: number) =>
    apiClient.get<ProjectMaterialRequirement[]>(`/api/Projects/${projectId}/material-requirements`),
  runMrp: (projectId: number, _warehouseId?: number) =>
    apiClient.post<MRPCalculationResponse[]>(`/api/Projects/${projectId}/mrp-runs`),
  getLatestMrp: (projectId: number, _warehouseId?: number) =>
    apiClient.get<MRPCalculationResponse[]>(`/api/Projects/${projectId}/mrp-runs/latest`),
  adjustBudget: (body: AdjustProjectBudgetRequest) =>
    apiClient.post<ProjectBudgetHistoryResponse>("/api/Projects/adjust-budget", body),
  getBudgetHistories: (projectId: number) =>
    apiClient.get<ProjectBudgetHistoryResponse[]>(`/api/Projects/${projectId}/budget-histories`),
  /**
   * Download the role-specific .xlsx workbook built from live project data.
   * Full view for ADMIN/owning PM/assigned CUSTOMER, inventory view for a
   * linked WAREHOUSE_MANAGER. 403 when the caller cannot access the project.
   */
  exportProject: (projectId: number) =>
    apiClient.download(`/api/Projects/${projectId}/export`),
  update: (projectId: number, body: UpdateProjectRequest) =>
    apiClient.put<ProjectResponse>(`/api/Projects/${projectId}`, body),
  changeStatus: (
    projectId: number,
    action: "start" | "pause" | "cancel" | "reopen" | "complete",
    rowVersion: string,
  ) =>
    apiClient.post<{
      projectId: number;
      status: ProjectStatus;
      rowVersion: string;
    }>(`/api/Projects/${projectId}/${action}`, { rowVersion }),
  reassignProjectManager: (projectId: number, projectManagerUserId: number, rowVersion: string) =>
    apiClient.put<ProjectResponse>(`/api/Projects/${projectId}/project-manager`, {
      projectManagerUserId,
      rowVersion,
    }),
  assignCustomer: async (
    projectId: number,
    customerUserId: number | null,
    rowVersion: string,
  ) => {
    const response = await apiClient.put<RawProjectResponse | string>(
      `/api/Projects/${projectId}/customer`,
      {
        customerUserId,
        rowVersion,
      },
    );
    return {
      ...response,
      result:
        response.isSuccess && typeof response.result === "object" && response.result !== null
          ? normalizeProject(response.result)
          : response.result,
    };
  },
};
