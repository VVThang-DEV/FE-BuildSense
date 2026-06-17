import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
  Package,
  ShoppingCart,
  CalendarCheck2,
  HardHat,
  Brain,
  FileBarChart,
  Users,
  SlidersHorizontal,
  BellRing,
  Home,
  ClipboardList,
  ScanLine,
  Warehouse,
  Truck,
} from "lucide-react";
import type { Role } from "./session";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  group: "Overview" | "Operations" | "Field" | "Intelligence" | "Admin" | "Portal";
};

export const NAV: NavItem[] = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["manager", "admin", "staff"], group: "Overview" },
  { to: "/app/projects", label: "Projects", icon: FolderKanban, roles: ["manager", "admin", "engineer"], group: "Overview" },

  { to: "/app/materials", label: "Material Catalog", icon: Package, roles: ["admin", "manager", "engineer"], group: "Operations" },
  { to: "/app/procurement", label: "Procurement", icon: ShoppingCart, roles: ["manager", "admin"], group: "Operations" },
  { to: "/app/check", label: "Daily Check", icon: ScanLine, roles: ["manager", "admin"], group: "Operations" },

  { to: "/app/site/", label: "Today on Site", icon: HardHat, roles: ["engineer"], group: "Field" },
  { to: "/app/site/report", label: "Daily Report", icon: ClipboardList, roles: ["engineer"], group: "Field" },
  { to: "/app/site/attendance", label: "Attendance", icon: CalendarCheck2, roles: ["engineer"], group: "Field" },

  { to: "/app/ai", label: "AI Agent", icon: Brain, roles: ["admin", "manager", "staff"], group: "Intelligence" },
  { to: "/app/reports", label: "Reports", icon: FileBarChart, roles: ["admin", "manager", "staff"], group: "Intelligence" },

  { to: "/app/admin/wbs", label: "WBS & Baseline", icon: FolderKanban, roles: ["admin"], group: "Admin" },
  { to: "/app/admin/thresholds", label: "Inventory Thresholds", icon: SlidersHorizontal, roles: ["admin", "staff"], group: "Admin" },
  { to: "/app/admin/warehouses", label: "Warehouses", icon: Warehouse, roles: ["admin", "manager"], group: "Admin" },
  { to: "/app/admin/suppliers", label: "Suppliers", icon: Truck, roles: ["admin", "manager"], group: "Admin" },
  { to: "/app/staff/users", label: "Users & Access", icon: Users, roles: ["staff"], group: "Admin" },
  { to: "/app/staff/notifications", label: "Notification Rules", icon: BellRing, roles: ["staff"], group: "Admin" },

  { to: "/app/portal", label: "My House", icon: Home, roles: ["customer"], group: "Portal" },
];

export function navForRole(role: Role): NavItem[] {
  return NAV.filter((n) => n.roles.includes(role));
}
