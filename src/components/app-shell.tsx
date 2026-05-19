import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronRight, HardHat, LogOut, Search, Bell, Sparkles } from "lucide-react";
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

export function AppShell({ session }: { session: Session }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [project, setProject] = useState(projects[0].id);
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

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex h-14 items-center gap-2 px-4 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <HardHat className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">BuildSense AI</p>
            <p className="text-[10px] opacity-70">Construction PM</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-5">
          {grouped.map(([group, list]) => (
            <div key={group}>
              <p className="px-2 mb-1 text-[10px] uppercase tracking-wider opacity-60">{group}</p>
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
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="rounded-md bg-sidebar-accent/40 p-3 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-sidebar-primary font-medium">
              <Sparkles className="h-3 w-3" /> AI Insights
            </div>
            <p className="opacity-80">{aiAlerts[0].title}</p>
            <Button asChild size="sm" variant="secondary" className="w-full mt-1 h-7 text-xs">
              <Link to="/app/ai">Open AI Agent</Link>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/80 backdrop-blur px-4">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HardHat className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm font-semibold">BuildSense</p>
          </div>

          <Breadcrumbs pathname={pathname} />

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:flex relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search projects, materials…" className="pl-8 h-9 text-sm" />
            </div>

            {session.role !== "customer" && session.role !== "staff" && (
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger className="h-9 w-[180px] hidden md:flex">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="px-3 py-2 border-b text-sm font-medium">Notifications</div>
                <div className="max-h-72 overflow-y-auto divide-y">
                  {aiAlerts.map((a) => (
                    <div key={a.id} className="px-3 py-2.5 text-xs space-y-1">
                      <p className="font-medium">{a.title}</p>
                      <p className="text-muted-foreground">{a.detail}</p>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 hover:bg-muted transition-colors">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {session.avatar}
                  </span>
                  <div className="hidden sm:block text-left leading-tight">
                    <p className="text-xs font-medium">{session.name}</p>
                    <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[session.role]}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="text-sm">{session.name}</p>
                    <p className="text-xs text-muted-foreground font-normal">{session.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate({ to: "/login" })}>
                  Switch role
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onLogout} className="text-destructive">
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile nav strip */}
        <div className="lg:hidden border-b bg-card overflow-x-auto">
          <div className="flex gap-1 p-2 min-w-max">
            {items.slice(0, 8).map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const parts = pathname.split("/").filter(Boolean);
  return (
    <nav className="hidden md:flex items-center text-xs text-muted-foreground">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center">
          {i > 0 && <ChevronRight className="h-3 w-3 mx-1 opacity-50" />}
          <span className={i === parts.length - 1 ? "text-foreground font-medium" : ""}>
            {decodeURIComponent(p)}
          </span>
        </span>
      ))}
    </nav>
  );
}

export { Badge };
