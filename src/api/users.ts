import { apiClient } from "./client";

export type AccountResponse = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  role: number; // 0=ADMIN  1=PM  2=ENGINEER
};

export const BACKEND_ROLE_LABEL: Record<number, string> = {
  0: "Admin",
  1: "Project Manager",
  2: "Field Engineer",
};

export const usersApi = {
  getProfile:    () =>
    apiClient.get<AccountResponse>("/api/useraccount/GetUserProfile"),
  /** Manager only */
  getAll:        () =>
    apiClient.get<AccountResponse[]>("/api/useraccount/GetAllAccountAsync"),
  /** Manager only */
  countUsers:    () =>
    apiClient.get<number>("/api/useraccount/CountUser"),
  getUserId: () =>
    apiClient.get<number>("/api/useraccount/GetUserId"),
  updateProfile: (body: { firstName?: string; lastName?: string; phoneNumber?: string }) =>
    apiClient.put<string>("/api/useraccount/UpdateUserProfile", body),
  /** Manager only */
  updateRole:    (id: number, body: { role: number }) =>
    apiClient.put<string>(`/api/useraccount/UpdateUserRoleProfile/${id}`, body),
};
