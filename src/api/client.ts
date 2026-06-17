/** Base URL — override with VITE_API_URL env var for production */
const BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:5290";

export type ApiEnvelope<T = unknown> = {
  statusCode: number;
  isSuccess: boolean;
  errorMessage: string | null;
  result: T;
};

export function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem("bs.session.v1");
    return raw ? (JSON.parse(raw) as { token?: string }).token ?? null : null;
  } catch {
    return null;
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<ApiEnvelope<T>> {
  const token = getStoredToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) throw new Error("Unauthorized — token may have expired");

  return res.json() as Promise<ApiEnvelope<T>>;
}

export const apiClient = {
  get:    <T>(path: string)                 => call<T>("GET",    path),
  post:   <T>(path: string, body?: unknown) => call<T>("POST",   path, body),
  put:    <T>(path: string, body?: unknown) => call<T>("PUT",    path, body),
  delete: <T>(path: string)                 => call<T>("DELETE", path),
};
