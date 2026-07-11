import { apiClient } from "./client";

type ProjectStatus = "PLANNING" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";

type RawProjectResponse = Omit<Partial<ProjectResponse>, "status"> & {
  baselineStart?: string;
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
  currency: string;
  pmUserID: number;
  pmName: string;
  totalTasks: number;
  totalAIAlerts: number;
  status: ProjectStatus;
  createdDate: string;
};

export type CreateProjectRequest = {
  projectName: string;
  address?: string;
  startDate: string;
  pmUserID: number;
  baselineStart: string;
  baselineEnd: string;
};

const STATUS_BY_NUMBER: Record<number, ProjectStatus> = {
  0: "PLANNING",
  1: "IN_PROGRESS",
  2: "COMPLETED",
  3: "DELAYED",
};

function normalizeStatus(status: RawProjectResponse["status"]): ProjectStatus {
  if (typeof status === "number") return STATUS_BY_NUMBER[status] ?? "PLANNING";
  if (typeof status === "string") {
    const numeric = Number(status);
    if (Number.isInteger(numeric)) return STATUS_BY_NUMBER[numeric] ?? "PLANNING";
    const upper = status.toUpperCase();
    if (upper === "IN_PROGRESS" || upper === "COMPLETED" || upper === "DELAYED") return upper;
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
    currency: project.currency ?? "VND",
    pmUserID: project.pmUserID ?? 0,
    pmName: project.pmName ?? "",
    totalTasks: project.totalTasks ?? 0,
    totalAIAlerts: project.totalAIAlerts ?? 0,
    status: normalizeStatus(project.status),
    createdDate: normalizeDate(project.createdDate),
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
  create: (body: CreateProjectRequest) => apiClient.post<string>("/api/projects", body),
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
};
