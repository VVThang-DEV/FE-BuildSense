import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
  Package,
  ShoppingCart,
  Users,
  Warehouse,
  Truck,
  Tags,
} from "lucide-react";
import type { Role } from "./session";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  group: "Overview" | "Operations" | "Field" | "Intelligence" | "Setup" | "Portal";
};

export const NAV: NavItem[] = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "PM", "WAREHOUSE_MANAGER"], group: "Overview" },
  { to: "/app/projects", label: "Projects", icon: FolderKanban, roles: ["ADMIN", "PM"], group: "Overview" },

  { to: "/app/materials", label: "Material Catalog", icon: Package, roles: ["ADMIN", "PM", "WAREHOUSE_MANAGER"], group: "Operations" },
  { to: "/app/procurement", label: "Procurement", icon: ShoppingCart, roles: ["ADMIN", "PM", "WAREHOUSE_MANAGER"], group: "Operations" },

  { to: "/app/admin/categories", label: "Categories", icon: Tags, roles: ["ADMIN", "PM", "WAREHOUSE_MANAGER"], group: "Setup" },
  { to: "/app/admin/warehouses", label: "Warehouses", icon: Warehouse, roles: ["ADMIN", "WAREHOUSE_MANAGER"], group: "Setup" },
  { to: "/app/admin/suppliers", label: "Suppliers", icon: Truck, roles: ["ADMIN", "SUPPLIER"], group: "Setup" },
  { to: "/app/staff/users", label: "Users & Access", icon: Users, roles: ["ADMIN"], group: "Setup" },
  { to: "/app/portal", label: "Customer Portal", icon: Users, roles: ["CUSTOMER"], group: "Portal" },
];

export function navForRole(role: Role): NavItem[] {
  return NAV.filter((n) => n.roles.includes(role));
}

export function isPathAllowedForRole(role: Role, pathname: string): boolean {
  const current = pathname.replace(/\/+$/, "") || "/";
  if (current === "/app" || current === "/app/profile") return true;
  return navForRole(role).some(
    (item) => {
      const itemPath = item.to.replace(/\/+$/, "") || "/";
      return current === itemPath || (itemPath !== "/app" && current.startsWith(itemPath + "/"));
    },
  );
}
