import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, User, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";
import buildSenseLogo from "@/assets/buildsense-logo.svg";

const roles = [
  { to: "/", label: "Project Manager", icon: LayoutDashboard },
  { to: "/app/admin/warehouses", label: "Warehouse Manager", icon: Warehouse },
  { to: "/app/admin/suppliers", label: "Supplier", icon: Package },
  { to: "/customer", label: "Customer", icon: User },
] as const;

export function RoleNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={buildSenseLogo} alt="BuildSense AI logo" className="h-8 w-8 rounded-md object-cover" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">BuildSense AI</p>
            <p className="text-xs text-muted-foreground">Construction PM</p>
          </div>
        </div>
        <nav className="flex items-center gap-1 rounded-full border bg-background p-1">
          {roles.map((r) => {
            const active = pathname === r.to;
            const Icon = r.icon;
            return (
              <Link
                key={r.to}
                to={r.to}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{r.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
