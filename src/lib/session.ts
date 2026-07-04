import { useEffect, useState, useSyncExternalStore } from "react";

export type Role = "ADMIN" | "PM" | "WAREHOUSE_MANAGER" | "SUPPLIER" | "CUSTOMER";

export type Session = {
  role: Role;
  name: string;
  email: string;
  avatar: string;
  /** JWT from real backend login. */
  token?: string;
  /** Numeric user ID from backend. */
  userId?: number;
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin/Staff",
  PM: "Project Manager",
  WAREHOUSE_MANAGER: "Warehouse Manager",
  SUPPLIER: "Supplier",
  CUSTOMER: "Customer",
};

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/app/dashboard",
  PM: "/app/dashboard",
  WAREHOUSE_MANAGER: "/app/dashboard",
  SUPPLIER: "/app/admin/suppliers",
  CUSTOMER: "/app/portal",
};

const KEY = "bs.session.v1";
const VALID_ROLES = new Set<Role>(["ADMIN", "PM", "WAREHOUSE_MANAGER", "SUPPLIER", "CUSTOMER"]);

type JwtClaims = Record<string, string | number | undefined>;

function decodeJwt(token: string): JwtClaims {
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as JwtClaims;
  } catch {
    return {};
  }
}

function readClaim(claims: JwtClaims, ...keys: string[]): string {
  for (const key of keys) {
    const value = claims[key];
    if (value !== undefined && value !== null) return String(value);
  }
  return "";
}

function roleFromClaims(claims: JwtClaims): Role {
  const roleRaw = readClaim(
    claims,
    "Role",
    "role",
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
  ).trim().toUpperCase();
  return VALID_ROLES.has(roleRaw as Role) ? (roleRaw as Role) : "CUSTOMER";
}

export function isTokenExpired(token?: string): boolean {
  if (!token) return false;
  const exp = decodeJwt(token).exp;
  if (typeof exp !== "number") return false;
  return Date.now() >= exp * 1000;
}

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

let cachedRaw: string | null = undefined as unknown as string | null;
let cachedSession: Session | null = null;

function normalizeStoredSession(session: Session): Session | null {
  if (VALID_ROLES.has(session.role)) return session;
  return null;
}

function snapshot(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === cachedRaw) return cachedSession;

    cachedRaw = raw;
    cachedSession = raw ? normalizeStoredSession(JSON.parse(raw) as Session) : null;

    if (!cachedSession || (cachedSession.token && isTokenExpired(cachedSession.token))) {
      window.localStorage.removeItem(KEY);
      cachedRaw = null;
      cachedSession = null;
    }

    return cachedSession;
  } catch {
    return null;
  }
}

/** Create a real session from a JWT returned by POST /api/auth/login. */
export function loginWithToken(token: string): Session {
  const claims = decodeJwt(token);
  const fullName = readClaim(
    claims,
    "FullName",
    "name",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
  );
  const email = readClaim(claims, "Email", "email");
  const userId = parseInt(
    readClaim(claims, "UserId", "nameid", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier") ||
      "0",
    10,
  );
  const avatar =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((namePart) => namePart[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";
  const session: Session = {
    role: roleFromClaims(claims),
    name: fullName,
    email,
    avatar,
    token,
    userId,
  };
  const raw = JSON.stringify(session);
  window.localStorage.setItem(KEY, raw);
  cachedRaw = raw;
  cachedSession = session;
  emit();
  return session;
}

export function getToken(): string | null {
  const token = snapshot()?.token ?? null;
  return token && !isTokenExpired(token) ? token : null;
}

export function logout() {
  cachedRaw = null;
  cachedSession = null;
  window.localStorage.removeItem(KEY);
  emit();
}

export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
