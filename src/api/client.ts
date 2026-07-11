import { isTokenExpired, logout } from "@/lib/session";

/** Base URL - override with VITE_API_URL env var for production */
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5290";

export type ApiEnvelope<T = unknown> = {
  statusCode: number;
  isSuccess: boolean;
  errorMessage: string | null;
  result: T;
};

export function requireApiResult<T>(response: ApiEnvelope<T>, fallback: string): T {
  if (!response.isSuccess) {
    const resultMessage =
      typeof response.result === "string" && response.result.trim() ? response.result : null;
    throw new Error(response.errorMessage ?? resultMessage ?? fallback);
  }
  return response.result;
}

function isApiEnvelope(value: unknown): value is ApiEnvelope {
  return typeof value === "object" && value !== null && "isSuccess" in value && "result" in value;
}

function fallbackMessage(status: number): string {
  if (status === 401) return "Unauthorized - token may have expired";
  if (status === 403) return "Forbidden - your account does not have access";
  if (status === 404) return "Not found";
  if (status >= 500) return "Server error";
  return "Request failed";
}

export function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem("bs.session.v1");
    const token = raw ? ((JSON.parse(raw) as { token?: string }).token ?? null) : null;
    if (token && isTokenExpired(token)) {
      logout();
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

async function parseResponse<T>(res: Response): Promise<ApiEnvelope<T>> {
  const text = await res.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (isApiEnvelope(payload)) return payload as ApiEnvelope<T>;

  if (!res.ok) {
    if (res.status === 401) logout();

    const modelStateError =
      typeof payload === "object" && payload !== null && "errors" in payload
        ? Object.values((payload as { errors?: Record<string, string[]> }).errors ?? {})
            .flat()
            .join("; ")
        : null;

    return {
      statusCode: res.status,
      isSuccess: false,
      errorMessage: modelStateError || fallbackMessage(res.status),
      result: null as T,
    };
  }

  return {
    statusCode: res.status,
    isSuccess: true,
    errorMessage: null,
    result: payload as T,
  };
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

  return parseResponse<T>(res);
}

async function callForm<T>(method: string, path: string, body: FormData): Promise<ApiEnvelope<T>> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { method, headers, body });
  return parseResponse<T>(res);
}

export const apiClient = {
  get: <T>(path: string) => call<T>("GET", path),
  post: <T>(path: string, body?: unknown) => call<T>("POST", path, body),
  postForm: <T>(path: string, body: FormData) => callForm<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => call<T>("PUT", path, body),
  delete: <T>(path: string) => call<T>("DELETE", path),
};
