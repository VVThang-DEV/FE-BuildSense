import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle, Briefcase, Sparkles, TrendingDown, Users, ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { aiAlerts, kpis, projects } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — BuildSense AI" }] }),
  component: Dashboard,
});

const healthClass = {
  "on-track": "bg-success/15 text-success border-success/30",
  "at-risk": "bg-warning/20 text-warning-foreground border-warning/40",
  delayed: "bg-destructive/15 text-destructive border-destructive/30",
} as const;

function Dashboard() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground">All projects · Updated 2 min ago</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/app/reports">Export report</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/app/check">Run daily check</Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Projects", value: kpis.totalProjects, icon: Briefcase, sub: "+2 this quarter" },
          { label: "On-site Workforce", value: kpis.activeWorkforce, icon: Users, sub: "5 sites today" },
          { label: "Budget Variance", value: `${kpis.budgetVariance}%`, icon: TrendingDown, sub: "vs. baseline", tone: "warn" },
          { label: "AI Alerts", value: kpis.aiAlerts, icon: Sparkles, sub: "Needs review", tone: "ai" },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <Icon className={cn("h-4 w-4", k.tone === "ai" && "text-ai", k.tone === "warn" && "text-warning")} />
                </div>
                <p className="text-2xl font-semibold mt-2">{k.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* AI Action Center */}
        <Card className="lg:col-span-2 border-ai/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ai" />
              <CardTitle className="text-base">AI Action Center</CardTitle>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/ai">Open AI Agent <ArrowUpRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiAlerts.map((a) => (
              <div key={a.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className={cn(
                      "h-4 w-4 mt-0.5 shrink-0",
                      a.severity === "high" ? "text-destructive" :
                      a.severity === "medium" ? "text-warning" : "text-muted-foreground",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>
                    <div className="mt-2 rounded-md bg-ai/10 border border-ai/20 p-2 text-xs">
                      <span className="text-ai font-medium">Suggestion · </span>
                      {a.suggestion}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="default" className="h-7 text-xs">Apply suggestion</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs">Dismiss</Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Variance summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cost — Plan vs Actual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.slice(0, 5).map((p) => {
              const ratio = (p.spent / p.budget) * 100;
              const over = ratio > p.percent + 5;
              return (
                <div key={p.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="truncate">{p.name}</span>
                    <span className={cn("font-medium", over ? "text-destructive" : "text-success")}>
                      {ratio.toFixed(0)}% spent / {p.percent}% done
                    </span>
                  </div>
                  <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="absolute h-full bg-primary/60" style={{ width: `${p.percent}%` }} />
                    <div className={cn("absolute h-full opacity-70", over ? "bg-destructive" : "bg-success")}
                      style={{ width: `${Math.min(ratio, 100)}%`, mixBlendMode: "multiply" }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Gantt */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Multi-Project Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {projects.map((p) => (
              <div key={p.id} className="grid grid-cols-[200px_1fr_80px] gap-3 items-center">
                <Link to="/app/projects/$id" params={{ id: p.id }} className="text-sm font-medium hover:underline truncate">
                  {p.name}
                </Link>
                <div className="relative h-6 rounded-md bg-muted overflow-hidden">
                  {p.phases.map((ph, i) => (
                    <div
                      key={ph.name}
                      className={cn(
                        "absolute top-0 bottom-0 flex items-center px-2 text-[10px] text-white/95",
                        i === 0 ? "bg-primary/70" : i === 1 ? "bg-primary/85" : "bg-primary",
                      )}
                      style={{ left: `${ph.start}%`, width: `${ph.end - ph.start}%` }}
                    >
                      <span className="truncate">{ph.name}</span>
                    </div>
                  ))}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-ai" style={{ left: `${p.percent}%` }} />
                </div>
                <Badge variant="outline" className={cn("justify-center text-[10px]", healthClass[p.health])}>
                  {p.health}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
