import { apiClient } from "./client";

type BackendRole = 0 | 1 | 2;

export type AccountResponse = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  role: BackendRole; // 0=ADMIN  1=PM  2=ENGINEER
};

type RawAccountResponse = Omit<AccountResponse, "role"> & {
  role: BackendRole | "ADMIN" | "PM" | "ENGINEER" | string | number;
};

type RawUserIdResponse = {
  userId?: number;
  UserId?: number;
};

export const BACKEND_ROLE_LABEL: Record<BackendRole, string> = {
  0: "Admin",
  1: "Project Manager",
  2: "Field Engineer",
};

const ROLE_BY_STRING: Record<string, BackendRole> = {
  ADMIN: 0,
  PM: 1,
  ENGINEER: 2,
};

function normalizeRole(role: RawAccountResponse["role"]): BackendRole {
  if (role === 0 || role === 1 || role === 2) return role;
  if (typeof role === "number") return 2;
  const numeric = Number(role);
  if (numeric === 0 || numeric === 1 || numeric === 2) return numeric;
  return ROLE_BY_STRING[String(role).toUpperCase()] ?? 2;
}

function normalizeAccount(account: RawAccountResponse): AccountResponse {
  return {
    ...account,
    role: normalizeRole(account.role),
  };
}

export const usersApi = {
  getProfile: async () => {
    const response = await apiClient.get<RawAccountResponse>("/api/useraccount/GetUserProfile");
    return {
      ...response,
      result: response.result ? normalizeAccount(response.result) : response.result,
    };
  },
  /** Admin only */
  getAll: async () => {
    const response = await apiClient.get<RawAccountResponse[]>("/api/useraccount/GetAllAccountAsync");
    return {
      ...response,
      result: (response.result ?? []).map(normalizeAccount),
    };
  },
  /** Admin only */
  countUsers:    () =>
    apiClient.get<number>("/api/useraccount/CountUser"),
  getUserId: async () => {
    const response = await apiClient.get<number | RawUserIdResponse>("/api/useraccount/GetUserId");
    return {
      ...response,
      result: typeof response.result === "number"
        ? response.result
        : response.result?.userId ?? response.result?.UserId ?? 0,
    };
  },
  updateProfile: (body: { firstName?: string; lastName?: string; phoneNumber?: string }) =>
    apiClient.put<string>("/api/useraccount/UpdateUserProfile", body),
  /** Admin only */
  updateRole:    (id: number, body: { role: number }) =>
    apiClient.put<string>(`/api/useraccount/UpdateUserRoleProfile/${id}`, body),
};
