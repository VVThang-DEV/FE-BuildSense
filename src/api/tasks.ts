import { apiClient } from "./client";
import type { PhaseResponse } from "./phases";

export type CreateTaskRequest = {
  taskName: string;
  assignedToUserID: number;
  plannedBudget: number;
  baselineStart: string;
  baselineEnd: string;
  materials: TaskMaterialRequest[];
};

export type TaskMaterialRequest = {
  variantId: number;
  materialId: number;
  grossQuantityRequired: number;
};

export type TaskMaterialResponse = TaskMaterialRequest & {
  materialId: number;
  materialName: string;
  variantName: string;
  taskName?: string | null;
  unit: string;
};

export type TaskStatus =
  | "PENDING"
  | "ACTIVE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type TaskPhaseSummary = Pick<
  PhaseResponse,
  | "phaseId"
  | "name"
  | "sequenceOrder"
  | "status"
  | "baselineStart"
  | "baselineEnd"
  | "workCategoryId"
  | "workCategoryName"
>;

export type TaskResponse = {
  taskId: number;
  projectId: number;
  phaseId: number;
  phaseName: string;
  phase?: TaskPhaseSummary | null;
  taskName: string;
  assignedToUserID: number;
  assignedToUserName: string;
  plannedBudget: number;
  actualCost: number;
  actualProgressPct: number;
  status: TaskStatus;
  baselineStart: string;
  baselineEnd: string;
  rowVersion: string;
  materialRequirements: TaskMaterialResponse[];
};

export type UpdateTaskRequest = {
  phaseId: number;
  taskName: string;
  assignedToUserID: number;
  plannedBudget: number;
  baselineStart: string;
  baselineEnd: string;
  rowVersion: string;
};

export type TaskIssueStatus = "OPEN" | "RESOLVED";

export type TaskIssueResponse = {
  issueId: number;
  taskId: number;
  reportedByUserId: number;
  reportedByName?: string | null;
  description: string;
  photoUrl?: string | null;
  status: TaskIssueStatus;
  resolutionNote?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  rowVersion: string;
};

export type CreateTaskIssueRequest = {
  description: string;
  photoUrl?: string;
};

export type ResolveTaskIssueRequest = {
  resolutionNote?: string;
  rowVersion: string;
};

export const taskIssuesApi = {
  /** Owning PM or assigned WORKER. Returns 201. */
  report: (taskId: number, body: CreateTaskIssueRequest) =>
    apiClient.post<TaskIssueResponse>(`/api/Tasks/${taskId}/issues`, body),
  /** Owning PM, assigned WORKER, or ADMIN. Newest first. */
  listByTask: (taskId: number) =>
    apiClient.get<TaskIssueResponse[]>(`/api/Tasks/${taskId}/issues`),
  /** Owning PM only; open issues only. */
  resolve: (issueId: number, body: ResolveTaskIssueRequest) =>
    apiClient.put<TaskIssueResponse>(`/api/Tasks/issues/${issueId}/resolve`, body),
};

export const tasksApi = {
  /** Create a task under a phase. Project is derived server-side from the phase. */
  create: (phaseId: number, body: CreateTaskRequest) =>
    apiClient.post<TaskResponse>(`/api/Phases/${phaseId}/tasks`, body),
  getByProject: (projectId: number) =>
    apiClient.get<TaskResponse[]>(`/api/Projects/${projectId}/tasks`),
  getById: (taskId: number) => apiClient.get<TaskResponse>(`/api/Tasks/${taskId}`),
  getAssigned: () => apiClient.get<TaskResponse[]>("/api/Tasks/assigned"),
  update: (taskId: number, body: UpdateTaskRequest) =>
    apiClient.put<TaskResponse>(`/api/Tasks/${taskId}`, body),
  changeStatus: (taskId: number, action: "cancel" | "reject" | "reopen", rowVersion: string) =>
    apiClient.post<{ taskId: number; status: TaskStatus; rowVersion: string }>(
      `/api/Tasks/${taskId}/${action}`,
      {
        rowVersion,
      },
    ),
  assignMaterial: (taskId: number, body: TaskMaterialRequest) =>
    apiClient.post<TaskMaterialResponse>(`/api/Projects/tasks/${taskId}/materials`, body),
};
