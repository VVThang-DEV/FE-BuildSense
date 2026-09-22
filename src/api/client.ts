import {
  getRefreshToken,
  isTokenExpired,
  logout,
  updateSessionTokens,
  type AuthTokens,
} from "@/lib/session";

const BASE = "";

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
    const validationMessage =
      typeof response.result === "object" && response.result !== null
        ? Object.values(response.result as Record<string, unknown>)
            .flatMap((value) => (Array.isArray(value) ? value : []))
            .filter((value): value is string => typeof value === "string")
            .join("; ")
        : null;
    throw new Error(validationMessage || response.errorMessage || resultMessage || fallback);
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
  if (status === 409) return "This record changed. Reload it and try again";
  if (status === 410) return "This feature has been retired and is no longer available";
  if (status === 429) return "Too many requests. Wait a moment and try again";
  if (status >= 500) return "Server error";
  return "Request failed";
}

export function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem("bs.session.v1");
    const token = raw ? ((JSON.parse(raw) as { token?: string }).token ?? null) : null;
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

  if (isApiEnvelope(payload)) {
    return {
      ...(payload as ApiEnvelope<T>),
      // The transport status is authoritative now that controllers propagate
      // ApiResponse.StatusCode instead of flattening failures to 200/400.
      statusCode: res.status,
    };
  }

  if (!res.ok) {
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

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refreshToken,
          deviceInfo: typeof navigator === "undefined" ? undefined : navigator.userAgent,
        }),
      });
      const response = await parseResponse<AuthTokens>(res);
      if (!res.ok || !response.isSuccess || !response.result?.accessToken) {
        logout();
        return null;
      }
      updateSessionTokens(response.result);
      return response.result.accessToken;
    } catch {
      logout();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function canRefresh(path: string): boolean {
  const normalized = path.toLowerCase();
  return ![
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/api/auth/logout",
    "/api/auth/verification",
    "/api/auth/resend-verification",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
  ].some((publicPath) => normalized.startsWith(publicPath));
}

async function authorizedToken(path: string): Promise<string | null> {
  const token = getStoredToken();
  if (token && !isTokenExpired(token)) return token;
  if (!canRefresh(path)) return token;
  return refreshAccessToken();
}

async function call<T>(
  method: string,
  path: string,
  body?: unknown,
  retryAfterRefresh = true,
): Promise<ApiEnvelope<T>> {
  const token = await authorizedToken(path);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retryAfterRefresh && canRefresh(path) && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return call<T>(method, path, body, false);
  }
  if (res.status === 401) logout();
  return parseResponse<T>(res);
}

async function callForm<T>(method: string, path: string, body: FormData): Promise<ApiEnvelope<T>> {
  const token = await authorizedToken(path);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(`${BASE}${path}`, { method, headers, body });
  if (res.status === 401 && canRefresh(path) && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${refreshed}`;
      res = await fetch(`${BASE}${path}`, { method, headers, body });
    }
  }
  if (res.status === 401) logout();
  return parseResponse<T>(res);
}

export type FileDownload = {
  status: number;
  blob: Blob | null;
  filename: string | null;
  errorMessage: string | null;
};

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
  if (utf8) {
    try {
      return decodeURIComponent(utf8);
    } catch {
      return utf8;
    }
  }
  return /filename="?([^";]+)"?/i.exec(header)?.[1] ?? null;
}

async function download(path: string): Promise<FileDownload> {
  const token = await authorizedToken(path);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(`${BASE}${path}`, { headers });
  if (res.status === 401 && canRefresh(path) && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${refreshed}`;
      res = await fetch(`${BASE}${path}`, { headers });
    }
  }
  if (res.status === 401) logout();
  if (!res.ok) {
    let message: string | null = null;
    try {
      const payload = await res.clone().json();
      if (isApiEnvelope(payload)) message = payload.errorMessage;
    } catch {
      // non-JSON error body — fall back to status text
    }
    return {
      status: res.status,
      blob: null,
      filename: null,
      errorMessage: message ?? fallbackMessage(res.status),
    };
  }
  return {
    status: res.status,
    blob: await res.blob(),
    filename: filenameFromDisposition(res.headers.get("content-disposition")),
    errorMessage: null,
  };
}

async function downloadPost(path: string, body?: unknown): Promise<FileDownload> {
  const token = await authorizedToken(path);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const init = (auth: string | null): RequestInit => ({
    method: "POST",
    headers: auth ? { ...headers, Authorization: `Bearer ${auth}` } : headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let res = await fetch(`${BASE}${path}`, init(token));
  if (res.status === 401 && canRefresh(path) && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) res = await fetch(`${BASE}${path}`, init(refreshed));
  }
  if (res.status === 401) logout();
  if (!res.ok) {
    let message: string | null = null;
    try {
      const payload = await res.clone().json();
      if (isApiEnvelope(payload)) message = payload.errorMessage;
    } catch {
      // non-JSON error body — fall back to status text
    }
    return {
      status: res.status,
      blob: null,
      filename: null,
      errorMessage: message ?? fallbackMessage(res.status),
    };
  }
  return {
    status: res.status,
    blob: await res.blob(),
    filename: filenameFromDisposition(res.headers.get("content-disposition")),
    errorMessage: null,
  };
}

export const apiClient = {
  get: <T>(path: string) => call<T>("GET", path),
  post: <T>(path: string, body?: unknown) => call<T>("POST", path, body),
  postForm: <T>(path: string, body: FormData) => callForm<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => call<T>("PUT", path, body),
  delete: <T>(path: string) => call<T>("DELETE", path),
  download: (path: string) => download(path),
  downloadPost: (path: string, body?: unknown) => downloadPost(path, body),
};
