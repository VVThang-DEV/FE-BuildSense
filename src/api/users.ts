import { apiClient } from "./client";

export type BackendRole = "ADMIN" | "PM" | "WAREHOUSE_MANAGER" | "SUPPLIER" | "CUSTOMER";
export type BackendRoleValue = 0 | 1 | 2 | 3 | 4;

export type AccountResponse = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  imgUrl?: string | null;
  role: BackendRole;
};

type RawAccountResponse = Omit<AccountResponse, "role"> & {
  role: BackendRole | BackendRoleValue | string | number;
};

type RawUserIdResponse = {
  userId?: number;
  UserId?: number;
};

export const BACKEND_ROLE_LABEL: Record<BackendRole, string> = {
  ADMIN: "Admin/Staff",
  PM: "Project Manager",
  WAREHOUSE_MANAGER: "Warehouse Manager",
  SUPPLIER: "Supplier",
  CUSTOMER: "Customer",
};

export const BACKEND_ROLE_VALUE: Record<BackendRole, BackendRoleValue> = {
  ADMIN: 0,
  PM: 1,
  WAREHOUSE_MANAGER: 2,
  SUPPLIER: 3,
  CUSTOMER: 4,
};

export const USER_MANAGEMENT_ROLES: BackendRole[] = [
  "ADMIN",
  "PM",
  "WAREHOUSE_MANAGER",
  "SUPPLIER",
  "CUSTOMER",
];

const ROLE_BY_NUMBER: Record<number, BackendRole> = {
  0: "ADMIN",
  1: "PM",
  2: "WAREHOUSE_MANAGER",
  3: "SUPPLIER",
  4: "CUSTOMER",
};

function normalizeRole(role: RawAccountResponse["role"]): BackendRole {
  if (typeof role === "number") return ROLE_BY_NUMBER[role] ?? "CUSTOMER";
  const numeric = Number(role);
  if (Number.isInteger(numeric)) return ROLE_BY_NUMBER[numeric] ?? "CUSTOMER";

  const upper = String(role).trim().toUpperCase();
  if (upper in BACKEND_ROLE_LABEL) return upper as BackendRole;
  return "CUSTOMER";
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
    const response = await apiClient.get<RawAccountResponse[]>(
      "/api/useraccount/GetAllAccountAsync",
    );
    return {
      ...response,
      result: (response.result ?? []).map(normalizeAccount),
    };
  },
  /** Admin only */
  countUsers: () => apiClient.get<number>("/api/useraccount/CountUser"),
  getUserId: async () => {
    const response = await apiClient.get<number | RawUserIdResponse>("/api/useraccount/GetUserId");
    return {
      ...response,
      result:
        typeof response.result === "number"
          ? response.result
          : (response.result?.userId ?? response.result?.UserId ?? 0),
    };
  },
  updateProfile: (body: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    imgUrl?: string;
  }) => apiClient.put<string>("/api/useraccount/UpdateUserProfile", body),
  /** Admin only */
  updateRole: (id: number, body: { role: BackendRoleValue }) =>
    apiClient.put<string>(`/api/useraccount/UpdateUserRoleProfile/${id}`, body),
};
