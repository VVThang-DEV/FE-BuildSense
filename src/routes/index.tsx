import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
import { useState } from "react";
import {
  AlertTriangle,
  Briefcase,
  ChevronDown,
  Sparkles,
  TrendingDown,
  Users,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  aiAlerts,
  consolidatedPOs,
  kpis,
  projects,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Project Manager — BuildSense AI" },
      { name: "description", content: "AI-driven overview of all active construction projects." },
    ],
  }),
  component: PMDashboard,
});

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && "border-ai bg-ai/5")}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md",
              highlight ? "bg-ai text-ai-foreground" : "bg-muted text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          {highlight && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ai opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ai" />
            </span>
          )}
        </div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function healthColor(h: "on-track" | "at-risk" | "delayed") {
  return h === "on-track"
    ? "bg-success"
    : h === "at-risk"
      ? "bg-warning"
      : "bg-destructive";
}

function PMDashboard() {
  const [expanded, setExpanded] = useState<string | null>("po-001");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [approved, setApproved] = useState<Set<string>>(new Set());

  return (
    <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Project Manager Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          AI-driven overview across 12 active sites · Updated 2 min ago
        </p>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={Briefcase} label="Total Projects" value={String(kpis.totalProjects)} hint="3 nearing handover" />
        <KpiCard icon={Users} label="Active Workforce" value={String(kpis.activeWorkforce)} hint="across 8 sites" />
        <KpiCard
          icon={TrendingDown}
          label="Budget Variance"
          value={`${kpis.budgetVariance}%`}
          hint="vs. baseline"
        />
        <KpiCard
          icon={Sparkles}
          label="AI Alerts"
          value={String(kpis.aiAlerts)}
          hint="1 high priority"
          highlight
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* AI Action Center */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-ai" />
                AI Action Center
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Predictive insights from project pace, weather, and supply data
              </p>
            </div>
            <Badge variant="outline" className="border-ai text-ai">Live</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiAlerts
              .filter((a) => !dismissed.has(a.id))
              .map((a, i) => (
                <div
                  key={a.id}
                  className={cn(
                    "rounded-lg border p-4",
                    i === 0 && "border-ai/40 bg-ai/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                          a.severity === "high"
                            ? "bg-destructive/15 text-destructive"
                            : a.severity === "medium"
                              ? "bg-warning/20 text-warning-foreground"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
                        <div className="mt-3 rounded-md bg-background p-3 text-xs">
                          <p className="font-medium text-ai">Suggested action</p>
                          <p className="mt-1 text-foreground">{a.suggestion}</p>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 uppercase",
                        a.severity === "high" && "border-destructive text-destructive",
                      )}
                    >
                      {a.severity}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setDismissed((d) => new Set(d).add(a.id));
                        toast.success("Suggestion applied", {
                          description: "Workforce reallocation drafted for review.",
                        });
                      }}
                    >
                      Apply suggestion
                    </Button>
                    <Button size="sm" variant="outline">View details</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDismissed((d) => new Set(d).add(a.id))}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Multi-Project Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Multi-Project Timeline</CardTitle>
            <p className="text-xs text-muted-foreground">Phase progress · Today marker</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.map((p) => (
              <div key={p.id}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground">{p.percent}%</span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("absolute inset-y-0 left-0", healthColor(p.health))}
                    style={{ width: `${p.percent}%` }}
                  />
                  <div
                    className="absolute inset-y-0 w-px bg-foreground/70"
                    style={{ left: `${p.percent}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  {p.phases.map((ph) => (
                    <span key={ph.name}>{ph.name}</span>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-2 text-xs">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> On track</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> At risk</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> Delayed</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart PO Inbox */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-ai" />
                Smart PO Approval Inbox
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                AI consolidates per-site material requests into single bulk purchase orders
              </p>
            </div>
            <Badge variant="secondary">{consolidatedPOs.length} pending</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Material</th>
                  <th className="px-4 py-3 text-left font-medium">Consolidated From</th>
                  <th className="px-4 py-3 text-right font-medium">Total Qty</th>
                  <th className="px-4 py-3 text-left font-medium">Vendor</th>
                  <th className="px-4 py-3 text-right font-medium">Est. Savings</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {consolidatedPOs.map((po) => {
                  const isOpen = expanded === po.id;
                  const isApproved = approved.has(po.id);
                  return (
                    <Fragment key={po.id}>
                      <tr key={po.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpanded(isOpen ? null : po.id)}
                            className="flex items-center gap-2 font-medium hover:text-ai"
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform",
                                isOpen && "rotate-180",
                              )}
                            />
                            {po.item}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {po.sources.length} site requests
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {po.totalQty.toLocaleString()} {po.unit}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{po.vendor}</td>
                        <td className="px-4 py-3 text-right font-medium text-success">
                          {po.estSavings}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {isApproved ? (
                              <Badge className="bg-success text-success-foreground">
                                <Check className="mr-1 h-3 w-3" /> Approved
                              </Badge>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setApproved((a) => new Set(a).add(po.id));
                                    toast.success(`Approved: ${po.item}`, {
                                      description: `${po.totalQty} ${po.unit} → ${po.vendor}`,
                                    });
                                  }}
                                >
                                  Approve All
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b bg-muted/30">
                          <td colSpan={6} className="px-4 py-3">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                              Source requests consolidated by AI
                            </p>
                            <div className="grid gap-2 sm:grid-cols-3">
                              {po.sources.map((s) => (
                                <div
                                  key={s.house}
                                  className="rounded-md border bg-background p-3"
                                >
                                  <p className="text-xs text-muted-foreground">{s.house}</p>
                                  <p className="mt-1 text-sm font-semibold">
                                    {s.qty.toLocaleString()} {po.unit}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
