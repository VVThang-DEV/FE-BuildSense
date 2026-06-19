import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle, Briefcase, Sparkles, TrendingDown, Users,
  ArrowUpRight, TrendingUp, Clock, ShieldCheck, Bell,
  SlidersHorizontal, UserCheck, UserX, FileBarChart2,
  BarChart3, CheckCircle2, AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/session";
import { aiAlerts, kpis, projects, users, notificationRules, alertThresholds } from "@/lib/mock-data";
import { cn, healthConfig } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { usersApi } from "@/api/users";
import { MockDataBanner } from "@/components/mock-banner";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — BuildSense AI" }] }),
  component: Dashboard,
});

const KPI_CONFIG = [
  { label: "Active Projects", value: String(kpis.totalProjects), icon: Briefcase, sub: "+2 this quarter", accent: "text-primary", bg: "bg-primary/8", trend: TrendingUp, trendCls: "text-success" },
  { label: "On-site Workforce", value: String(kpis.activeWorkforce), icon: Users, sub: "Across 5 active sites", accent: "text-ai", bg: "bg-ai/8", trend: TrendingUp, trendCls: "text-success" },
  { label: "Budget Variance", value: `${kpis.budgetVariance}%`, icon: TrendingDown, sub: "vs. approved baseline", accent: "text-warning-foreground", bg: "bg-warning/10", trend: TrendingDown, trendCls: "text-warning-foreground" },
  { label: "AI Alerts", value: String(kpis.aiAlerts), icon: Sparkles, sub: "Needs review today", accent: "text-destructive", bg: "bg-destructive/8", trend: Clock, trendCls: "text-muted-foreground" },
] as const;

function ManagerDashboard() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visibleAlerts = aiAlerts.filter((a) => !dismissed.has(a.id));
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <MockDataBanner message="Demo data — KPIs, AI alerts, projects and cost charts are sample data for demonstration." />
      <PageHeader
        section="Overview"
        title="Executive Dashboard"
        description="All projects · Updated 2 min ago"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 text-xs"><Link to="/app/reports">Export report</Link></Button>
            <Button asChild size="sm" className="h-8 text-xs"><Link to="/app/check">Run daily check</Link></Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI_CONFIG.map((k) => {
          const Icon = k.icon; const Trend = k.trend;
          return (
            <Card key={k.label} className="border hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", k.bg)}><Icon className={cn("h-4 w-4", k.accent)} /></div>
                  <Trend className={cn("h-3.5 w-3.5 mt-0.5", k.trendCls)} />
                </div>
                <p className={cn("text-[2rem] font-bold leading-none tracking-tight", k.accent)}>{k.value}</p>
                <p className="text-[12px] font-medium text-foreground mt-1.5">{k.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" style={{ borderColor: "oklch(0.57 0.23 285 / 0.25)" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ai/10"><Sparkles className="h-3.5 w-3.5 text-ai" /></div>
              <div><CardTitle className="text-[14px] font-semibold">AI Action Center</CardTitle><p className="text-[11px] text-muted-foreground">{kpis.aiAlerts} alerts need attention</p></div>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs"><Link to="/app/ai">Open AI Agent <ArrowUpRight className="h-3 w-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-3">
            {visibleAlerts.length === 0 && <p className="text-[13px] text-muted-foreground py-2 text-center">All alerts reviewed ✔</p>}
            {visibleAlerts.map((a) => (
              <div key={a.id} className="rounded-xl border p-3.5 space-y-2.5 hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-2.5">
                  <div className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", a.severity === "high" ? "bg-destructive/15" : a.severity === "medium" ? "bg-warning/20" : "bg-muted")}>
                    <AlertTriangle className={cn("h-3 w-3", a.severity === "high" ? "text-destructive" : a.severity === "medium" ? "text-warning-foreground" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold">{a.title}</p>
                      <Badge variant="outline" className={cn("text-[9px] uppercase font-bold tracking-wide h-4 px-1.5", a.severity === "high" ? "bg-destructive/10 text-destructive border-destructive/25" : a.severity === "medium" ? "bg-warning/15 text-warning-foreground border-warning/30" : "bg-muted text-muted-foreground")}>{a.severity}</Badge>
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{a.detail}</p>
                    <div className="mt-2 rounded-lg bg-ai/8 border border-ai/15 px-3 py-2 text-[12px] leading-snug">
                      <span className="text-ai font-semibold">AI Suggestion · </span>
                      <span className="text-foreground/80">{a.suggestion}</span>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <Button size="sm" className="h-7 text-[11px] px-3" onClick={() => { setDismissed((d) => new Set([...d, a.id])); toast.success("Suggestion applied"); }}>Apply suggestion</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-[11px] px-3" onClick={() => { setDismissed((d) => new Set([...d, a.id])); toast.info("Alert dismissed"); }}>Dismiss</Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 border-b"><CardTitle className="text-[14px] font-semibold">Cost — Plan vs. Actual</CardTitle><p className="text-[11px] text-muted-foreground">Budget utilisation per project</p></CardHeader>
          <CardContent className="space-y-3.5 pt-3">
            {projects.slice(0, 5).map((p) => {
              const ratio = (p.spent / p.budget) * 100; const over = ratio > p.percent + 5;
              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-[12px]">
                    <span className="font-medium truncate max-w-[130px]">{p.name}</span>
                    <span className={cn("font-semibold tabular-nums shrink-0", over ? "text-destructive" : "text-success")}>{ratio.toFixed(0)}% / {p.percent}%</span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div className="absolute h-full bg-primary/25 rounded-full" style={{ width: `${p.percent}%` }} />
                    <div className={cn("absolute h-full rounded-full", over ? "bg-destructive/70" : "bg-success/70")} style={{ width: `${Math.min(ratio, 100)}%` }} />
                  </div>
                  <p className="text-[10.5px] text-muted-foreground">{over ? "⚠ Over budget pace" : "✓ Within budget"}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
          <div><CardTitle className="text-[14px] font-semibold">Multi-Project Timeline</CardTitle><p className="text-[11px] text-muted-foreground">Phase-level Gantt · progress marker in violet</p></div>
          <Button asChild variant="outline" size="sm" className="h-7 text-xs"><Link to="/app/projects">View all projects</Link></Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {projects.map((p) => {
              const hc = healthConfig[p.health];
              return (
                <div key={p.id} className="grid grid-cols-[180px_1fr_90px] gap-3 items-center">
                  <Link to="/app/projects/$id" params={{ id: p.id }} className="text-[13px] font-medium hover:text-primary transition-colors truncate">{p.name}</Link>
                  <div className="relative h-7 rounded-lg bg-muted overflow-hidden">
                    {p.phases.map((ph, i) => (
                      <div key={ph.name} className={cn("absolute top-0 bottom-0 flex items-center px-2 text-[10px] font-medium text-white/90", i === 0 ? "bg-primary/55" : i === 1 ? "bg-primary/72" : "bg-primary/88")} style={{ left: `${ph.start}%`, width: `${ph.end - ph.start}%` }}>
                        <span className="truncate">{ph.name}</span>
                      </div>
                    ))}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-ai shadow-[0_0_4px_oklch(0.57_0.23_285)]" style={{ left: `${p.percent}%` }} />
                  </div>
                  <Badge variant="outline" className={cn("justify-center text-[10px] font-semibold", hc.cls)}>{hc.label}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminDashboard() {
  const session = useSession();
  const isLive = !!session?.token;

  const { data: liveUserCount } = useQuery({
    queryKey: ["user-count"],
    queryFn: async () => { const r = await usersApi.countUsers(); return r.result ?? null; },
    enabled: isLive,
    staleTime: 60_000,
  });

  const activeUsers = users.filter((u) => u.status === "active").length;
  const invitedUsers = users.filter((u) => u.status === "invited").length;
  const highThresholds = alertThresholds.filter((t) => t.severity === "high").length;
  const healthCounts = {
    "on-track": projects.filter((p) => p.health === "on-track").length,
    "at-risk": projects.filter((p) => p.health === "at-risk").length,
    "delayed": projects.filter((p) => p.health === "delayed").length,
  };

  const totalUsersValue = isLive && liveUserCount != null ? String(liveUserCount) : String(users.length);
  const totalUsersSub = isLive && liveUserCount != null ? `${liveUserCount} registered accounts` : `${activeUsers} active · ${invitedUsers} pending`;

  const adminKpis = [
    { label: "Total Users", value: totalUsersValue, icon: Users, sub: totalUsersSub, accent: "text-primary", bg: "bg-primary/8" },
    { label: "Projects On Track", value: `${healthCounts["on-track"]}/${projects.length}`, icon: CheckCircle2, sub: `${healthCounts["at-risk"]} at-risk · ${healthCounts["delayed"]} delayed`, accent: "text-success", bg: "bg-success/10" },
    { label: "Critical Thresholds", value: String(highThresholds), icon: SlidersHorizontal, sub: `${alertThresholds.length} total rules configured`, accent: "text-destructive", bg: "bg-destructive/8" },
    { label: "AI Alerts Active", value: String(kpis.aiAlerts), icon: Sparkles, sub: "Pending PM review", accent: "text-ai", bg: "bg-ai/8" },
  ];

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <MockDataBanner message="Demo data — user roster, thresholds and portfolio health are sample data. Only Total Users KPI may be live." />
      <PageHeader
        section="Admin"
        title="System Dashboard"
        description="Platform health, user management and threshold monitoring."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 text-xs"><Link to="/app/staff/users">Manage users</Link></Button>
            <Button asChild size="sm" className="h-8 text-xs"><Link to="/app/admin/thresholds">Thresholds</Link></Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {adminKpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="border hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg mb-3", k.bg)}><Icon className={cn("h-4 w-4", k.accent)} /></div>
                <p className={cn("text-[2rem] font-bold leading-none tracking-tight", k.accent)}>{k.value}</p>
                <p className="text-[12px] font-medium text-foreground mt-1.5">{k.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
            <div><CardTitle className="text-[14px] font-semibold">User Roster</CardTitle><p className="text-[11px] text-muted-foreground">Active sessions and pending invites</p></div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs"><Link to="/app/staff/users">View all <ArrowUpRight className="h-3 w-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="pt-3 space-y-1">
            {users.slice(0, 6).map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40 transition-colors">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                  {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{u.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{u.role} · {u.project}</p>
                </div>
                <Badge variant="outline" className={cn("text-[10px] shrink-0", u.status === "active" ? "bg-success/10 text-success border-success/25" : u.status === "invited" ? "bg-warning/15 text-warning-foreground border-warning/30" : "bg-muted text-muted-foreground")}>
                  {u.status === "active" ? "Active" : u.status === "invited" ? "Invited" : "Disabled"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[14px] font-semibold">Alert Thresholds</CardTitle>
              <Button asChild variant="ghost" size="sm" className="h-6 text-xs px-2"><Link to="/app/admin/thresholds">Edit</Link></Button>
            </div>
          </CardHeader>
          <CardContent className="pt-3 space-y-3">
            {alertThresholds.map((t) => (
              <div key={t.id} className="flex items-start gap-2.5">
                <div className={cn("mt-1 h-2 w-2 rounded-full shrink-0", t.severity === "high" ? "bg-destructive" : t.severity === "medium" ? "bg-warning" : "bg-success")} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium leading-snug">{t.metric}</p>
                  <p className="text-[11px] text-muted-foreground">Trigger ≥ {t.value} {t.unit}</p>
                </div>
                <Badge variant="outline" className={cn("text-[9px] capitalize shrink-0", t.severity === "high" ? "bg-destructive/10 text-destructive border-destructive/25" : t.severity === "medium" ? "bg-warning/15 text-warning-foreground border-warning/30" : "bg-success/10 text-success border-success/25")}>{t.severity}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
          <div><CardTitle className="text-[14px] font-semibold">Portfolio Health Overview</CardTitle><p className="text-[11px] text-muted-foreground">Colour-coded risk status across all projects</p></div>
          <Button asChild variant="outline" size="sm" className="h-7 text-xs"><Link to="/app/projects">View all</Link></Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map((p) => {
              const hc = healthConfig[p.health];
              const ratio = (p.spent / p.budget) * 100;
              return (
                <Link key={p.id} to="/app/projects/$id" params={{ id: p.id }}>
                  <div className="rounded-xl border p-3 hover:border-primary/40 transition-colors space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold truncate">{p.name}</p>
                      <Badge variant="outline" className={cn("text-[10px] shrink-0 ml-1", hc.cls)}>{hc.label}</Badge>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/70 rounded-full" style={{ width: `${p.percent}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{p.percent}% complete</span>
                      <span className={ratio > p.percent + 5 ? "text-destructive font-medium" : "text-success font-medium"}>{ratio.toFixed(0)}% spent</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StaffDashboard() {
  const activeUsers = users.filter((u) => u.status === "active").length;
  const invitedUsers = users.filter((u) => u.status === "invited").length;

  const staffKpis = [
    { label: "Active Users", value: String(activeUsers), icon: UserCheck, sub: `${invitedUsers} pending invitation`, accent: "text-success", bg: "bg-success/10" },
    { label: "Notification Rules", value: String(notificationRules.length), icon: Bell, sub: "All channels configured", accent: "text-primary", bg: "bg-primary/8" },
    { label: "Roles in System", value: "5", icon: ShieldCheck, sub: "Admin · PM · Staff · Engineer · Customer", accent: "text-ai", bg: "bg-ai/8" },
    { label: "Disabled Accounts", value: String(users.filter((u) => u.status === "disabled").length || 0), icon: UserX, sub: "Accounts deactivated", accent: "text-muted-foreground", bg: "bg-muted" },
  ];

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <MockDataBanner message="Demo data — user accounts, notification rules and platform health are sample data." />
      <PageHeader
        section="Staff"
        title="Operations Dashboard"
        description="User management, notifications and system configuration."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 text-xs"><Link to="/app/staff/notifications">Notification rules</Link></Button>
            <Button asChild size="sm" className="h-8 text-xs"><Link to="/app/staff/users">Invite user</Link></Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {staffKpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="border hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg mb-3", k.bg)}><Icon className={cn("h-4 w-4", k.accent)} /></div>
                <p className={cn("text-[2rem] font-bold leading-none tracking-tight", k.accent)}>{k.value}</p>
                <p className="text-[12px] font-medium text-foreground mt-1.5">{k.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
            <div><CardTitle className="text-[14px] font-semibold">User Accounts</CardTitle><p className="text-[11px] text-muted-foreground">All roles · manage access</p></div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs"><Link to="/app/staff/users">Manage <ArrowUpRight className="h-3 w-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="pt-3 space-y-1">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40 transition-colors">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                  {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate">{u.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{u.role}</p>
                </div>
                <Badge variant="outline" className={cn("text-[10px] shrink-0", u.status === "active" ? "bg-success/10 text-success border-success/25" : u.status === "invited" ? "bg-warning/15 text-warning-foreground border-warning/30" : "bg-muted text-muted-foreground")}>
                  {u.status === "active" ? "Active" : u.status === "invited" ? "Invited" : "Disabled"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
            <div><CardTitle className="text-[14px] font-semibold">Notification Rules</CardTitle><p className="text-[11px] text-muted-foreground">Events → channels mapping</p></div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs"><Link to="/app/staff/notifications">Edit <ArrowUpRight className="h-3 w-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="pt-3 space-y-3">
            {notificationRules.map((r) => (
              <div key={r.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                  <p className="text-[12px] font-medium">{r.event}</p>
                </div>
                <div className="flex gap-1.5 flex-wrap pl-5">
                  {r.channels.map((ch) => <Badge key={ch} variant="secondary" className="text-[10px] h-4 px-1.5">{ch}</Badge>)}
                  <span className="text-[11px] text-muted-foreground">→ {r.recipients}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b"><CardTitle className="text-[14px] font-semibold">Platform Health Snapshot</CardTitle><p className="text-[11px] text-muted-foreground">Operational status of all services</p></CardHeader>
        <CardContent className="pt-4 grid sm:grid-cols-3 gap-4">
          {[
            { label: "API / Server", status: "Operational", icon: CheckCircle2, cls: "text-success" },
            { label: "AI Engine", status: "Operational", icon: CheckCircle2, cls: "text-success" },
            { label: "Notification Queue", status: "3 pending", icon: BarChart3, cls: "text-warning-foreground" },
            { label: "File Storage", status: "Operational", icon: CheckCircle2, cls: "text-success" },
            { label: "Auth Service", status: "Operational", icon: ShieldCheck, cls: "text-success" },
            { label: "Audit Log", status: "Last write 2m ago", icon: FileBarChart2, cls: "text-muted-foreground" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-2.5 rounded-xl border p-3">
                <Icon className={cn("h-4 w-4 shrink-0", item.cls)} />
                <div>
                  <p className="text-[12px] font-medium">{item.label}</p>
                  <p className={cn("text-[11px]", item.cls)}>{item.status}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function Dashboard() {
  const session = useSession();
  const role = session?.role ?? "manager";
  if (role === "admin") return <AdminDashboard />;
  if (role === "staff") return <StaffDashboard />;
  return <ManagerDashboard />;
}
