import { useEffect, useState, useSyncExternalStore } from "react";

export type Role = "admin" | "manager" | "staff" | "engineer" | "customer";

export type Session = {
  role: Role;
  name: string;
  email: string;
  avatar: string;
  /** JWT from real backend login — absent for demo sessions */
  token?: string;
  /** Numeric user ID from backend */
  userId?: number;
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Project Manager",
  staff: "System Staff",
  engineer: "Field Engineer",
  customer: "Customer",
};

export const ROLE_HOME: Record<Role, string> = {
  admin: "/app/projects",
  manager: "/app/projects",
  staff: "/app/projects",
  engineer: "/app/projects",
  customer: "/app/projects",
};

/** Maps backend Role enum string/number → frontend Role */
const BACKEND_ROLE_MAP: Record<string, Role> = {
  ADMIN: "admin", PM: "manager", MANAGER: "manager", ENGINEER: "engineer",
  "0": "admin",  "1": "manager", "2": "engineer",
};

function decodeJwt(token: string): Record<string, string> {
  try {
    return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

const KEY = "bs.session.v1";

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Cache the last parsed snapshot so useSyncExternalStore gets a stable
// object reference when nothing has changed (avoids infinite-loop warning).
let _cachedRaw: string | null = undefined as unknown as string | null;
let _cachedSession: Session | null = null;

function snapshot(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === _cachedRaw) return _cachedSession;
    _cachedRaw = raw;
    _cachedSession = raw ? (JSON.parse(raw) as Session) : null;
    return _cachedSession;
  } catch {
    return null;
  }
}

/** Create a real session from a JWT returned by POST /api/auth/login */
export function loginWithToken(token: string): Session {
  const c = decodeJwt(token);
  const roleRaw =
    c["Role"] ??
    c["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ?? "";
  const role: Role = BACKEND_ROLE_MAP[roleRaw] ?? "manager";
  const fullName = c["FullName"] ?? "";
  const email    = c["Email"]    ?? "";
  const userId   = parseInt(c["UserId"] ?? "0", 10);
  const avatar   = fullName.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U";
  const session: Session = { role, name: fullName, email, avatar, token, userId };
  window.localStorage.setItem(KEY, JSON.stringify(session));
  emit();
  return session;
}

/** Returns stored JWT or null (null = demo session) */
export function getToken(): string | null {
  return snapshot()?.token ?? null;
}

export function logout() {
  window.localStorage.removeItem(KEY);
  emit();
}

export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

/** Returns true once mounted, useful to avoid SSR hydration mismatch. */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
