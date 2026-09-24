import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, OctagonX, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { requireApiResult } from "@/api/client";
import {
  projectsApi,
  type RecommendRiskActionsResponse,
  type ProjectRisk,
} from "@/api/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryError } from "@/components/query-error";
import { cn } from "@/lib/utils";

function formatMetric(value: unknown): string {
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "string" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function severityBadge(severity: string): string {
  return severity === "CRITICAL"
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : "border-warning/40 bg-warning/10 text-warning-foreground";
}

/**
 * Computed risk scan (ADMIN, owning PM). Polls while mounted — the backend
 * computes on demand and never persists. Task links jump to the task detail.
 */
export function ProjectRisksPanel({
  projectId,
  canRecommend,
  onOpenTask,
}: {
  projectId: number;
  canRecommend: boolean;
  onOpenTask: (taskId: number) => void;
}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<RecommendRiskActionsResponse | null>(null);
  const [suggestFailed, setSuggestFailed] = useState(false);

  const {
    data: scan,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["project-risks", projectId],
    queryFn: async () =>
      requireApiResult(await projectsApi.getRisks(projectId), "Could not load project risks"),
    enabled: projectId > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const risks = scan?.risks ?? [];
  const critical = risks.filter((risk) => risk.severity === "CRITICAL").length;

  const loadSuggestions = async () => {
    setSuggestBusy(true);
    setSuggestFailed(false);
    try {
      const response = await projectsApi.recommendActions(projectId);
      if (!response.isSuccess) {
        if (response.statusCode === 400) {
          toast.error("The AI returned malformed output — retry the suggestion request");
        } else {
          toast.error(response.errorMessage ?? "Could not load AI suggestions");
        }
        setSuggestFailed(true);
        return;
      }
      setSuggestions(response.result);
      if ((response.result?.actions ?? []).length === 0) {
        toast.success("No risks — no suggestions needed");
      }
    } catch {
      toast.error("Could not reach the backend");
      setSuggestFailed(true);
    } finally {
      setSuggestBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                {critical > 0 ? (
                  <OctagonX className="h-4 w-4 text-destructive" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-success" />
                )}
                Project risks
                {risks.length > 0 && (
                  <Badge variant="outline" className="tabular-nums">
                    {critical > 0 ? `${critical} critical` : `${risks.length} warning(s)`}
                  </Badge>
                )}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Computed on demand, never stored. Refreshes automatically while viewing.
                {scan?.generatedAt &&
                  ` Last scan ${new Date(scan.generatedAt).toLocaleString()}.`}
              </p>
            </div>
            {canRecommend && (
              <Button
                size="sm"
                variant="outline"
                onClick={loadSuggestions}
                disabled={suggestBusy || risks.length === 0}
                title="AI-suggested corrective actions — nothing is applied automatically"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {suggestBusy ? "Asking AI..." : suggestFailed ? "Retry suggestions" : "Get AI suggestions"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Scanning risks...</div>
          ) : isError ? (
            <QueryError
              message={error instanceof Error ? error.message : undefined}
              onRetry={() => refetch()}
            />
          ) : risks.length === 0 ? (
            <div className="flex items-center gap-3 p-8">
              <ShieldCheck className="h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="text-sm font-medium">All clear</p>
                <p className="text-xs text-muted-foreground">
                  No schedule, material, progress, or budget risks detected.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y">
              {risks.map((risk, index) => (
                <RiskRow
                  key={`${risk.riskType}-${risk.taskId ?? "project"}-${index}`}
                  risk={risk}
                  expanded={!!expanded[index]}
                  onToggle={() => setExpanded((c) => ({ ...c, [index]: !c[index] }))}
                  onOpenTask={onOpenTask}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {suggestions && (suggestions.actions ?? []).length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-ai" /> Suggested actions
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Manual execution only — work through these yourself. Nothing was applied.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {[...suggestions.actions]
                .sort((a, b) => a.priority - b.priority)
                .map((action, index) => (
                  <li key={index} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="tabular-nums">
                        P{action.priority}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          action.ownerRole === "WAREHOUSE_MANAGER"
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-primary/30 bg-primary/10 text-primary",
                        )}
                      >
                        {action.ownerRole === "WAREHOUSE_MANAGER" ? "Warehouse" : "PM"}
                      </Badge>
                      <p className="text-sm font-medium">{action.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{action.detail}</p>
                    {(action.relatedRiskTypes ?? []).length > 0 && (
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {(action.relatedRiskTypes ?? []).join(" · ")}
                      </p>
                    )}
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RiskRow({
  risk,
  expanded,
  onToggle,
  onOpenTask,
}: {
  risk: ProjectRisk;
  expanded: boolean;
  onToggle: () => void;
  onOpenTask: (taskId: number) => void;
}) {
  const metrics = Object.entries(risk.metrics ?? {});
  return (
    <li className="px-4 py-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 text-left"
      >
        <AlertTriangle
          className={cn(
            "h-4 w-4 shrink-0",
            risk.severity === "CRITICAL" ? "text-destructive" : "text-warning-foreground",
          )}
        />
        <Badge variant="outline" className={severityBadge(risk.severity)}>
          {risk.severity}
        </Badge>
        <span className="min-w-0 flex-1 truncate text-sm">{risk.message}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
        />
      </button>
      {expanded && (
        <div className="ml-6 mt-2 space-y-2 text-xs">
          <p className="text-muted-foreground">
            Type: <span className="font-mono">{risk.riskType}</span>
          </p>
          {metrics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {metrics.map(([key, value]) => (
                <Badge key={key} variant="secondary" className="font-mono font-normal tabular-nums">
                  {key}: {formatMetric(value)}
                </Badge>
              ))}
            </div>
          )}
          {risk.taskId != null && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onOpenTask(risk.taskId!)}>
              Open task #{risk.taskId}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
