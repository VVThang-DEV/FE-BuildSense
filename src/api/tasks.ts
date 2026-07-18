import { apiClient } from "./client";

export type CreateTaskRequest = {
  projectId: number;
  phaseName: string;
  taskName: string;
  assignedToUserID: number;
  plannedBudget: number;
  baselineStart: string;
  baselineEnd: string;
  materials: TaskMaterialRequest[];
};

export type TaskMaterialRequest = {
  variantId: number;
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

export type TaskResponse = {
  taskId: number;
  projectId: number;
  phaseName: string;
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

export type UpdateTaskRequest = Omit<CreateTaskRequest, "projectId" | "materials"> & {
  rowVersion: string;
};

export const tasksApi = {
  create: (body: CreateTaskRequest) => apiClient.post<string>("/api/Task", body),
  getByProject: (projectId: number) =>
    apiClient.get<TaskResponse[]>(`/api/Task/project/${projectId}`),
  update: (taskId: number, body: UpdateTaskRequest) =>
    apiClient.put<TaskResponse>(`/api/Task/${taskId}`, body),
  changeStatus: (taskId: number, action: "cancel" | "reject" | "reopen", rowVersion: string) =>
    apiClient.post<{ taskId: number; status: TaskStatus }>(`/api/Task/${taskId}/${action}`, {
      rowVersion,
    }),
  assignMaterial: (taskId: number, body: TaskMaterialRequest) =>
    apiClient.post<TaskMaterialResponse>(`/api/Projects/tasks/${taskId}/materials`, body),
};
