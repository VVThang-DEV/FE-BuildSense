import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle, Briefcase, Sparkles, TrendingDown, Users,
  ArrowUpRight, TrendingUp, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { aiAlerts, kpis, projects } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — BuildSense AI" }] }),
  component: Dashboard,
});

const healthConfig = {
  "on-track": { label: "On Track", cls: "bg-success/12 text-success border-success/30" },
  "at-risk":  { label: "At Risk",  cls: "bg-warning/20 text-warning-foreground border-warning/40" },
  delayed:    { label: "Delayed",  cls: "bg-destructive/12 text-destructive border-destructive/30" },
} as const;

const KPI_CONFIG = [
  {
    label: "Active Projects",
    value: String(kpis.totalProjects),
    icon: Briefcase,
    sub: "+2 this quarter",
    accent: "text-primary",
    bg: "bg-primary/8",
    trend: TrendingUp,
    trendCls: "text-success",
  },
  {
    label: "On-site Workforce",
    value: String(kpis.activeWorkforce),
    icon: Users,
    sub: "Across 5 active sites",
    accent: "text-ai",
    bg: "bg-ai/8",
    trend: TrendingUp,
    trendCls: "text-success",
  },
  {
    label: "Budget Variance",
    value: `${kpis.budgetVariance}%`,
    icon: TrendingDown,
    sub: "vs. approved baseline",
    accent: "text-warning-foreground",
    bg: "bg-warning/10",
    trend: TrendingDown,
    trendCls: "text-warning-foreground",
  },
  {
    label: "AI Alerts",
    value: String(kpis.aiAlerts),
    icon: Sparkles,
    sub: "Needs review today",
    accent: "text-destructive",
    bg: "bg-destructive/8",
    trend: Clock,
    trendCls: "text-muted-foreground",
  },
] as const;

function Dashboard() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Page header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-1">
            Overview
          </p>
          <h1 className="text-[1.75rem] font-bold tracking-tight">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All projects · Updated 2 min ago</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs">
            <Link to="/app/reports">Export report</Link>
          </Button>
          <Button asChild size="sm" className="h-8 text-xs">
            <Link to="/app/check">Run daily check</Link>
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI_CONFIG.map((k) => {
          const Icon = k.icon;
          const Trend = k.trend;
          return (
            <Card key={k.label} className="border hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", k.bg)}>
                    <Icon className={cn("h-4 w-4", k.accent)} />
                  </div>
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
        {/* AI Action Center */}
        <Card className="lg:col-span-2" style={{ borderColor: "oklch(0.57 0.23 285 / 0.25)" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ai/10">
                <Sparkles className="h-3.5 w-3.5 text-ai" />
              </div>
              <div>
                <CardTitle className="text-[14px] font-semibold">AI Action Center</CardTitle>
                <p className="text-[11px] text-muted-foreground">{kpis.aiAlerts} alerts need attention</p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link to="/app/ai">Open AI Agent <ArrowUpRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-3">
            {aiAlerts.map((a) => (
              <div key={a.id} className="rounded-xl border p-3.5 space-y-2.5 hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-2.5">
                  <div className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    a.severity === "high" ? "bg-destructive/15" : a.severity === "medium" ? "bg-warning/20" : "bg-muted",
                  )}>
                    <AlertTriangle className={cn(
                      "h-3 w-3",
                      a.severity === "high" ? "text-destructive" : a.severity === "medium" ? "text-warning-foreground" : "text-muted-foreground",
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold">{a.title}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] uppercase font-bold tracking-wide h-4 px-1.5",
                          a.severity === "high" ? "bg-destructive/10 text-destructive border-destructive/25"
                          : a.severity === "medium" ? "bg-warning/15 text-warning-foreground border-warning/30"
                          : "bg-muted text-muted-foreground",
                        )}
                      >
                        {a.severity}
                      </Badge>
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{a.detail}</p>
                    <div className="mt-2 rounded-lg bg-ai/8 border border-ai/15 px-3 py-2 text-[12px] leading-snug">
                      <span className="text-ai font-semibold">AI Suggestion · </span>
                      <span className="text-foreground/80">{a.suggestion}</span>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <Button size="sm" className="h-7 text-[11px] px-3">Apply suggestion</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-[11px] px-3">Dismiss</Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Cost variance panel */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-[14px] font-semibold">Cost — Plan vs. Actual</CardTitle>
            <p className="text-[11px] text-muted-foreground">Budget utilisation per project</p>
          </CardHeader>
          <CardContent className="space-y-3.5 pt-3">
            {projects.slice(0, 5).map((p) => {
              const ratio = (p.spent / p.budget) * 100;
              const over = ratio > p.percent + 5;
              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-[12px]">
                    <span className="font-medium truncate max-w-[130px]">{p.name}</span>
                    <span className={cn("font-semibold tabular-nums shrink-0", over ? "text-destructive" : "text-success")}>
                      {ratio.toFixed(0)}% / {p.percent}%
                    </span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div className="absolute h-full bg-primary/25 rounded-full" style={{ width: `${p.percent}%` }} />
                    <div
                      className={cn("absolute h-full rounded-full", over ? "bg-destructive/70" : "bg-success/70")}
                      style={{ width: `${Math.min(ratio, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10.5px] text-muted-foreground">{over ? "⚠ Over budget pace" : "✓ Within budget"}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Multi-project timeline */}
      <Card>
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-[14px] font-semibold">Multi-Project Timeline</CardTitle>
            <p className="text-[11px] text-muted-foreground">Phase-level Gantt overview · current progress marker in violet</p>
          </div>
          <Button asChild variant="outline" size="sm" className="h-7 text-xs">
            <Link to="/app/projects">View all projects</Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {projects.map((p) => {
              const hc = healthConfig[p.health];
              return (
                <div key={p.id} className="grid grid-cols-[180px_1fr_90px] gap-3 items-center">
                  <Link
                    to="/app/projects/$id"
                    params={{ id: p.id }}
                    className="text-[13px] font-medium hover:text-primary transition-colors truncate"
                  >
                    {p.name}
                  </Link>
                  <div className="relative h-7 rounded-lg bg-muted overflow-hidden">
                    {p.phases.map((ph, i) => (
                      <div
                        key={ph.name}
                        className={cn(
                          "absolute top-0 bottom-0 flex items-center px-2 text-[10px] font-medium text-white/90",
                          i === 0 ? "bg-primary/55" : i === 1 ? "bg-primary/72" : "bg-primary/88",
                        )}
                        style={{ left: `${ph.start}%`, width: `${ph.end - ph.start}%` }}
                      >
                        <span className="truncate">{ph.name}</span>
                      </div>
                    ))}
                    {/* Progress marker */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-ai shadow-[0_0_4px_oklch(0.57_0.23_285)]"
                      style={{ left: `${p.percent}%` }}
                    />
                  </div>
                  <Badge variant="outline" className={cn("justify-center text-[10px] font-semibold", hc.cls)}>
                    {hc.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
