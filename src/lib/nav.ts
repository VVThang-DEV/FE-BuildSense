import type { LucideIcon } from "lucide-react";
import {
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
  { to: "/app/projects", label: "Projects", icon: FolderKanban, roles: ["manager", "admin", "engineer"], group: "Overview" },

  { to: "/app/materials", label: "Material Catalog", icon: Package, roles: ["admin", "manager"], group: "Operations" },
  { to: "/app/procurement", label: "Procurement", icon: ShoppingCart, roles: ["manager", "admin"], group: "Operations" },

  { to: "/app/admin/categories", label: "Categories", icon: Tags, roles: ["admin", "manager"], group: "Setup" },
  { to: "/app/admin/warehouses", label: "Warehouses", icon: Warehouse, roles: ["admin", "manager"], group: "Setup" },
  { to: "/app/admin/suppliers", label: "Suppliers", icon: Truck, roles: ["admin", "manager"], group: "Setup" },
  { to: "/app/staff/users", label: "Users & Access", icon: Users, roles: ["manager"], group: "Setup" },
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
