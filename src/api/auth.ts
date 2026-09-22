import { apiClient } from "./client";

export type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
};

export const authApi = {
  /** POST /api/auth/login → returns JWT string in result */
  login: (body: { userEmail: string; password: string }) =>
    apiClient.post<AuthTokenResponse>("/api/auth/login", body),

  refresh: (refreshToken: string) =>
    apiClient.post<AuthTokenResponse>("/api/auth/refresh", {
      refreshToken,
      deviceInfo: typeof navigator === "undefined" ? undefined : navigator.userAgent,
    }),

  logout: (refreshToken: string) => apiClient.post("/api/auth/logout", { refreshToken }),

  forgotPassword: (email: string) => apiClient.post("/api/auth/forgot-password", { email }),

  resetPassword: (body: {
    userId: number;
    token: string;
    newPassword: string;
    confirmPassword: string;
  }) => apiClient.post("/api/auth/reset-password", body),

  changePassword: (body: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => apiClient.post("/api/auth/change-password", body),

  adminResetPassword: (userId: number) =>
    apiClient.post(`/api/auth/admin/reset-password/${userId}`),

  // Retired (HTTP 410): register, Verification, resend-verification.
  // Account provisioning is ADMIN-only via POST /api/UserAccount.
};
