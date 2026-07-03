import { apiClient } from "./client";
import type { BackendRoleValue } from "./users";

export const authApi = {
  /** POST /api/auth/login → returns JWT string in result */
  login: (body: { userEmail: string; password: string }) =>
    apiClient.post<string>("/api/auth/login", body),

  /** POST /api/auth/register → returns new userId in result */
  register: (body: {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    role: BackendRoleValue;
  }) => apiClient.post<number>("/api/auth/register", body),

  /** POST /api/auth/Verification */
  verify: (userId: number, verificationCode: string) =>
    apiClient.post("/api/auth/Verification", { userId, verificationCode }),
};
