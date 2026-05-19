import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ChevronRight, HardHat, LogOut, Search, Bell, Sparkles,
  Menu, X, ChevronDown,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { ROLE_LABELS, logout, type Session } from "@/lib/session";
import { navForRole } from "@/lib/nav";
import { aiAlerts, projects } from "@/lib/mock-data";

const ROLE_BADGE_STYLE: Record<string, string> = {
  admin:    "bg-destructive/15 text-destructive border-destructive/30",
  manager:  "bg-primary/15 text-primary border-primary/30",
  staff:    "bg-success/15 text-success border-success/30",
  engineer: "bg-warning/20 text-warning-foreground border-warning/35",
  customer: "bg-ai/15 text-ai border-ai/30",
};

export function AppShell({ session }: { session: Session }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [project, setProject] = useState(projects[0].id);
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = useMemo(() => navForRole(session.role), [session.role]);
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
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
          <HardHat className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <div className="leading-tight min-w-0">
          <p className="text-[13.5px] font-bold tracking-tight text-sidebar-foreground">BuildSense AI</p>
          <p className="text-[10px] font-medium text-sidebar-primary/80">Construction PM</p>
        </div>
      </div>

      {/* Project selector */}
      {session.role !== "customer" && session.role !== "staff" && (
        <div className="px-3 pt-3">
          <Select value={project} onValueChange={setProject}>
            <SelectTrigger className="h-8 text-xs bg-sidebar-accent border-sidebar-border text-sidebar-foreground [&>svg]:text-sidebar-foreground/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
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

      {/* AI insight card */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        <div className="rounded-xl p-3 space-y-2" style={{ background: "oklch(0.22 0.022 265 / 0.80)", border: "1px solid oklch(0.67 0.20 52 / 0.20)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "oklch(0.67 0.20 52)" }}>
              <Sparkles className="h-3 w-3" />
              AI Insight
            </div>
            <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
          </div>
          <p className="text-[11px] text-sidebar-foreground/70 leading-snug line-clamp-2">{aiAlerts[0].title}</p>
          <Button asChild size="sm" className="w-full h-7 text-[11px] font-medium bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
            <Link to="/app/ai">Open AI Agent →</Link>
          </Button>
        </div>

        {/* User row */}
        <div className="mt-2.5 flex items-center gap-2.5 px-1">
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
      <aside className="hidden lg:flex w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
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
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <HardHat className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
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
            {session.role !== "customer" && session.role !== "staff" && (
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger className="h-8 w-[160px] hidden xl:flex text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8">
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive border-[1.5px] border-card" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b">
                  <span className="text-sm font-semibold">Notifications</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{aiAlerts.length} new</Badge>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y">
                  {aiAlerts.map((a) => (
                    <div key={a.id} className="px-3.5 py-3 hover:bg-muted/40 transition-colors">
                      <div className="flex items-start gap-2.5">
                        <span className={cn(
                          "mt-1 h-1.5 w-1.5 rounded-full shrink-0",
                          a.severity === "high" ? "bg-destructive" : a.severity === "medium" ? "bg-warning" : "bg-success",
                        )} />
                        <div>
                          <p className="text-xs font-medium leading-snug">{a.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{a.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t">
                  <Button asChild variant="ghost" className="w-full h-7 text-xs">
                    <Link to="/app/ai">View all in AI Agent</Link>
                  </Button>
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
