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
  materialId: number;
  grossQuantityRequired: number;
};

export type TaskMaterialResponse = TaskMaterialRequest & {
  materialName: string;
  taskName?: string | null;
  unit: string;
};

export type TaskStatus = "PENDING" | "ACTIVE" | "COMPLETED" | string;

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
  materialRequirements: TaskMaterialResponse[];
};

export const tasksApi = {
  create: (body: CreateTaskRequest) => apiClient.post<string>("/api/Task", body),
  getByProject: (projectId: number) =>
    apiClient.get<TaskResponse[]>(`/api/Task/project/${projectId}`),
  assignMaterial: (taskId: number, body: TaskMaterialRequest) =>
    apiClient.post<TaskMaterialResponse>(`/api/Projects/tasks/${taskId}/materials`, body),
};
