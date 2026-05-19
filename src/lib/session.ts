import { useEffect, useState, useSyncExternalStore } from "react";

export type Role = "admin" | "manager" | "staff" | "engineer" | "customer";

export type Session = {
  role: Role;
  name: string;
  email: string;
  avatar: string;
};

export const DEMO_USERS: Record<Role, Session> = {
  admin: { role: "admin", name: "Priya Mehta", email: "priya.admin@buildsense.ai", avatar: "PM" },
  manager: { role: "manager", name: "Ananya Rao", email: "ananya.pm@buildsense.ai", avatar: "AR" },
  staff: { role: "staff", name: "Vikram Shah", email: "vikram.staff@buildsense.ai", avatar: "VS" },
  engineer: { role: "engineer", name: "Rahul Kumar", email: "rahul.site@buildsense.ai", avatar: "RK" },
  customer: { role: "customer", name: "Meera Nair", email: "meera.client@gmail.com", avatar: "MN" },
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Project Manager",
  staff: "System Staff",
  engineer: "Field Engineer",
  customer: "Customer",
};

export const ROLE_HOME: Record<Role, string> = {
  admin: "/app/admin/wbs",
  manager: "/app/dashboard",
  staff: "/app/staff/users",
  engineer: "/app/site",
  customer: "/app/portal",
};

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

export function login(role: Role) {
  const s = DEMO_USERS[role];
  window.localStorage.setItem(KEY, JSON.stringify(s));
  emit();
  return s;
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
