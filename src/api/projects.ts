import { apiClient } from "./client";

export type ProjectResponse = {
  projectId: number;
  projectName: string;
  address: string | null;
  startDate: string;
  status: "PLANNING" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";
  createdDate: string;
};

export const projectsApi = {
  getAll:  ()            => apiClient.get<ProjectResponse[]>("/api/projects"),
  getById: (id: number)  => apiClient.get<ProjectResponse>(`/api/projects/${id}`),
  create:  (body: { projectName: string; address?: string; startDate: string }) =>
    apiClient.post<string>("/api/projects", body),
};
