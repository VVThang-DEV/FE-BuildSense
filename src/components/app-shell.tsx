import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ChevronRight, LogOut, Search, Bell,
  Menu, X, ChevronDown, User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, logout, type Role, type Session } from "@/lib/session";
import { navForRole } from "@/lib/nav";
import { projectsApi } from "@/api/projects";
import buildSenseLogo from "@/assets/buildsense-logo.svg";

const ROLE_BADGE_STYLE: Record<Role, string> = {
  ADMIN: "bg-destructive/15 text-destructive border-destructive/30",
  PM: "bg-primary/15 text-primary border-primary/30",
  WAREHOUSE_MANAGER: "bg-success/15 text-success border-success/30",
  SUPPLIER: "bg-warning/20 text-warning-foreground border-warning/35",
  CUSTOMER: "bg-ai/15 text-ai border-ai/30",
};

export function AppShell({ session }: { session: Session }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [project, setProject] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = useMemo(() => navForRole(session.role), [session.role]);
  const canUseProjects = !!session.token && (session.role === "ADMIN" || session.role === "PM");
  const { data: liveProjects } = useQuery({
    queryKey: ["shell-projects"],
    queryFn: async () => {
      const response = await projectsApi.getAll();
      return response.result ?? [];
    },
    enabled: canUseProjects,
    staleTime: 60_000,
  });
  const grouped = useMemo(() => {
    const m = new Map<string, typeof items>();
    items.forEach((i) => {
      const arr = m.get(i.group) ?? [];
      arr.push(i);
      m.set(i.group, arr);
    });
    return Array.from(m.entries());
  }, [items]);

  const onLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex h-[60px] items-center gap-2.5 px-4 border-b border-sidebar-border shrink-0">
        <img src={buildSenseLogo} alt="BuildSense AI logo" className="h-8 w-8 rounded-md object-cover" />
        <div className="leading-tight min-w-0">
          <p className="text-[13.5px] font-bold tracking-tight text-sidebar-foreground">BuildSense AI</p>
          <p className="text-[10px] font-medium text-sidebar-primary/80">Construction PM</p>
        </div>
      </div>

      {/* Project selector */}
      {canUseProjects && (liveProjects ?? []).length > 0 && (
        <div className="px-3 pt-3">
          <Select value={project || String(liveProjects?.[0]?.projectId ?? "")} onValueChange={setProject}>
            <SelectTrigger className="h-8 text-xs bg-sidebar-accent border-sidebar-border text-sidebar-foreground [&>svg]:text-sidebar-foreground/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(liveProjects ?? []).map((p) => (
                <SelectItem key={p.projectId} value={String(p.projectId)} className="text-xs">{p.projectName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5 mt-1">
        {grouped.map(([group, list]) => (
          <div key={group}>
            <p className="px-2 mb-1.5 text-[9.5px] uppercase tracking-widest font-semibold opacity-40 text-sidebar-foreground">
              {group}
            </p>
            <div className="space-y-0.5">
              {list.map((item) => {
                const active =
                  pathname === item.to ||
                  (item.to !== "/app" && pathname.startsWith(item.to + "/"));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all duration-100",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-sidebar-primary-foreground/50" />
                    )}
                    <Icon className="h-[15px] w-[15px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5 px-1">
          <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold border", ROLE_BADGE_STYLE[session.role])}>
            {session.avatar}
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <p className="text-[12px] font-medium text-sidebar-foreground truncate">{session.name}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">{ROLE_LABELS[session.role]}</p>
          </div>
          <button
            onClick={onLogout}
            className="text-sidebar-foreground/40 hover:text-destructive transition-colors p-1"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[220px] shrink-0 flex-col h-screen sticky top-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground z-10">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3.5 right-3 text-sidebar-foreground/50 hover:text-sidebar-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-border bg-card/90 backdrop-blur-sm px-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          {/* Mobile menu button */}
          <button
            className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2">
            <img src={buildSenseLogo} alt="BuildSense AI logo" className="h-7 w-7 rounded-md object-cover" />
            <p className="text-sm font-bold">BuildSense</p>
          </div>

          <Breadcrumbs pathname={pathname} />

          <div className="ml-auto flex items-center gap-2">
            {/* Search */}
            <div className="hidden md:flex relative w-60">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search projects, materials…"
                className="pl-8 h-8 text-xs bg-muted/50 border-border focus:bg-card"
              />
            </div>

            {/* Desktop project selector (already in sidebar, keep small one here for context) */}
            {canUseProjects && (liveProjects ?? []).length > 0 && (
              <Select value={project || String(liveProjects?.[0]?.projectId ?? "")} onValueChange={setProject}>
                <SelectTrigger className="h-8 w-40 hidden xl:flex text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(liveProjects ?? []).map((p) => (
                    <SelectItem key={p.projectId} value={String(p.projectId)} className="text-xs">{p.projectName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8">
                  <Bell className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b">
                  <span className="text-sm font-semibold">Notifications</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">0 new</Badge>
                </div>
                <div className="px-3.5 py-6 text-center text-xs text-muted-foreground">
                  No backend notification endpoint is configured.
                </div>
              </PopoverContent>
            </Popover>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg pl-1 pr-2 py-1 hover:bg-muted transition-colors border border-transparent hover:border-border">
                  <span className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold border",
                    ROLE_BADGE_STYLE[session.role],
                  )}>
                    {session.avatar}
                  </span>
                  <div className="hidden sm:block text-left leading-tight">
                    <p className="text-[12px] font-semibold">{session.name}</p>
                    <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[session.role]}</p>
                  </div>
                  <ChevronDown className="hidden sm:block h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="text-sm font-semibold">{session.name}</p>
                    <p className="text-xs text-muted-foreground font-normal">{session.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate({ to: "/app/profile" })}>
                  <User className="h-3.5 w-3.5 mr-2" /> My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: "/login" })}>
                  Switch role
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const LABEL_MAP: Record<string, string> = {
    app: "App", dashboard: "Dashboard", projects: "Projects",
    materials: "Materials", procurement: "Procurement", check: "Daily Check",
    site: "Site", report: "Daily Report", attendance: "Attendance",
    ai: "AI Agent", reports: "Reports", admin: "Admin",
    wbs: "WBS & Baseline", thresholds: "Thresholds", staff: "Staff",
    users: "Users", notifications: "Notifications", portal: "My House",
    profile: "My Profile", verify: "Verify Email",
    warehouses: "Warehouses", suppliers: "Suppliers",
  };
  const parts = pathname.split("/").filter(Boolean);
  return (
    <nav className="hidden md:flex items-center text-xs text-muted-foreground gap-0.5">
      {parts.map((p, i) => {
        const label = LABEL_MAP[p] ?? decodeURIComponent(p);
        const isLast = i === parts.length - 1;
        return (
          <span key={i} className="flex items-center gap-0.5">
            {i > 0 && <ChevronRight className="h-3 w-3 mx-0.5 opacity-40" />}
            <span className={isLast ? "font-semibold text-foreground" : ""}>{label}</span>
          </span>
        );
      })}
    </nav>
  );
}

export { Badge };
