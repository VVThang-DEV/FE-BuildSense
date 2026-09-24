import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { requireApiResult } from "@/api/client";
import { projectsApi } from "@/api/projects";
import { phasesApi } from "@/api/phases";
import { tasksApi } from "@/api/tasks";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/app/admin/wbs")({
  head: () => ({ meta: [{ title: "WBS & Baseline - BuildSense AI" }] }),
  component: WbsPage,
});

function statusClass(status: string): string {
  if (status === "COMPLETED") return "border-success/30 bg-success/10 text-success";
  if (status === "ACTIVE" || status === "IN_PROGRESS")
    return "border-primary/30 bg-primary/10 text-primary";
  if (status === "REJECTED" || status === "CANCELLED")
    return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-warning/35 bg-warning/10 text-warning-foreground";
}

function formatDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

// ADMIN-only read-only WBS schedule: phases in sequence order with their
// tasks, baselines, progress, and per-task budget. No task-list management
// here — the PM owns tasks from the project workspace.
function WbsPage() {
  const session = useSession();
  const isLive = !!session?.token;
  const [projectId, setProjectId] = useState("");

  const projectsQuery = useQuery({
    queryKey: ["projects", "wbs"],
    queryFn: async () =>
      requireApiResult(await projectsApi.getAll(), "Could not load projects") ?? [],
    enabled: isLive,
    staleTime: 30_000,
  });

  const phasesQuery = useQuery({
    queryKey: ["phases", "wbs", projectId],
    queryFn: async () =>
      requireApiResult(
        await phasesApi.listByProject(Number(projectId)),
        "Could not load phases",
      ) ?? [],
    enabled: !!projectId,
    staleTime: 10_000,
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks", "wbs", projectId],
    queryFn: async () =>
      requireApiResult(await tasksApi.getByProject(Number(projectId)), "Could not load tasks") ??
      [],
    enabled: !!projectId,
    staleTime: 10_000,
  });

  const phases = phasesQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const tasksByPhase = new Map<number, typeof tasks>();
  for (const task of tasks) {
    const list = tasksByPhase.get(task.phaseId) ?? [];
    list.push(task);
    tasksByPhase.set(task.phaseId, list);
  }
  const projectBudget = phases
    .flatMap((phase) => tasksByPhase.get(phase.phaseId) ?? [])
    .reduce((sum, task) => sum + Number(task.plannedBudget || 0), 0);
  const projectActual = phases
    .flatMap((phase) => tasksByPhase.get(phase.phaseId) ?? [])
    .reduce((sum, task) => sum + Number(task.actualCost || 0), 0);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        section="Setup"
        title="WBS & Baseline"
        description="Read-only work-breakdown schedule: phases in sequence with per-task baselines, progress, and budget."
      />

      <Card className="mb-4 shadow-sm">
        <CardContent className="flex max-w-xl flex-col gap-2 p-4">
          <Label>Project</Label>
          <Select value={projectId} onValueChange={setProjectId} disabled={!isLive}>
            <SelectTrigger>
              <SelectValue placeholder={projectsQuery.isLoading ? "Loading..." : "Select project"} />
            </SelectTrigger>
            <SelectContent>
              {(projectsQuery.data ?? []).map((project) => (
                <SelectItem key={project.projectId} value={String(project.projectId)}>
                  {project.projectName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!projectId ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Select a project to view its work-breakdown schedule.
          </CardContent>
        </Card>
      ) : phasesQuery.isLoading || tasksQuery.isLoading ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Loading schedule...
          </CardContent>
        </Card>
      ) : phasesQuery.isError || tasksQuery.isError ? (
        <Card className="shadow-sm">
          <QueryError
            message={
              (phasesQuery.error ?? tasksQuery.error) instanceof Error
                ? ((phasesQuery.error ?? tasksQuery.error) as Error).message
                : undefined
            }
            onRetry={() => {
              phasesQuery.refetch();
              tasksQuery.refetch();
            }}
          />
        </Card>
      ) : phases.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            This project has no phases yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardContent className="flex flex-wrap gap-x-8 gap-y-2 p-4 text-sm">
              <span className="text-muted-foreground">
                Planned budget:{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {projectBudget.toLocaleString()}
                </span>
              </span>
              <span className="text-muted-foreground">
                Actual cost:{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {projectActual.toLocaleString()}
                </span>
              </span>
            </CardContent>
          </Card>
          {phases.map((phase) => {
            const phaseTasks = tasksByPhase.get(phase.phaseId) ?? [];
            const planned = phaseTasks.reduce((s, t) => s + Number(t.plannedBudget || 0), 0);
            const actual = phaseTasks.reduce((s, t) => s + Number(t.actualCost || 0), 0);
            return (
              <Card key={phase.phaseId} className="shadow-sm">
                <CardHeader className="border-b pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="tabular-nums">
                      #{phase.sequenceOrder}
                    </Badge>
                    <CardTitle className="text-base">{phase.name}</CardTitle>
                    <Badge variant="outline" className={statusClass(phase.status)}>
                      {phase.status}
                    </Badge>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDate(phase.baselineStart)} → {formatDate(phase.baselineEnd)} ·
                      Planned {planned.toLocaleString()} · Actual {actual.toLocaleString()}
                    </span>
                  </div>
                  {phase.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{phase.description}</p>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {phaseTasks.length === 0 ? (
                    <p className="p-4 text-xs text-muted-foreground">No tasks in this phase.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task</TableHead>
                          <TableHead>Baseline</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Progress</TableHead>
                          <TableHead className="text-right">Planned budget</TableHead>
                          <TableHead className="text-right">Actual cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {phaseTasks.map((task) => (
                      <TableRow key={task.taskId}>
                        <TableCell className="font-medium">
                          {task.taskName}
                          <p className="text-xs font-normal text-muted-foreground">
                            {task.assignedToUserName || `User #${task.assignedToUserID}`}
                          </p>
                        </TableCell>
                            <TableCell className="whitespace-nowrap text-xs">
                              {formatDate(task.baselineStart)} → {formatDate(task.baselineEnd)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusClass(task.status)}>
                                {task.status.replaceAll("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="ml-auto w-28">
                                <p className="mb-1 text-xs tabular-nums">
                                  {Number(task.actualProgressPct || 0)}%
                                </p>
                                <Progress
                                  value={Number(task.actualProgressPct || 0)}
                                  className="h-1.5"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {Number(task.plannedBudget || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {Number(task.actualCost || 0).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
