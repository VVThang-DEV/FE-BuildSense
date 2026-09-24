import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  UserRound,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { ProjectBudgetPanel } from "@/components/project-budget-panel";
import { ProjectExportButton } from "@/components/project-export-button";
import { QueryError } from "@/components/query-error";
import { requireApiResult } from "@/api/client";
import { projectsApi, type ProjectResponse } from "@/api/projects";
import { phasesApi } from "@/api/phases";
import { tasksApi, type TaskResponse } from "@/api/tasks";
import { useSession } from "@/lib/session";
import { cn, healthConfig } from "@/lib/utils";

export const Route = createFileRoute("/app/portal/$id")({
  head: () => ({ meta: [{ title: "Customer Project - BuildSense AI" }] }),
  component: CustomerProjectDetail,
});

const STATUS_HEALTH: Record<string, keyof typeof healthConfig> = {
  PLANNING: "on-track",
  IN_PROGRESS: "on-track",
  COMPLETED: "on-track",
  DELAYED: "delayed",
  PAUSED: "at-risk",
  CANCELLED: "at-risk",
};

function CustomerProjectDetail() {
  const { id } = Route.useParams();
  const session = useSession();
  const isLive = !!session?.token;

  const {
    data: project,
    isLoading: projectLoading,
    isError: projectError,
    error: projectErrorValue,
    refetch: refetchProject,
  } = useQuery({
    queryKey: ["customer-project", id],
    queryFn: async () =>
      requireApiResult(await projectsApi.getById(Number(id)), "Could not load project"),
    enabled: isLive,
    staleTime: 30_000,
  });

  const hasProjectAccess = project ? isAssignedCustomerProject(project, session?.userId) : false;

  const {
    data: phases = [],
    isLoading: phasesLoading,
    isError: phasesError,
    error: phasesErrorValue,
    refetch: refetchPhases,
  } = useQuery({
    queryKey: ["customer-project-phases", id],
    queryFn: async () =>
      requireApiResult(await phasesApi.listByProject(Number(id)), "Could not load phases") ?? [],
    enabled: isLive && hasProjectAccess,
    staleTime: 10_000,
  });
  const phasesForbidden =
    phasesErrorValue instanceof Error && /forbidden|403|not have access/i.test(phasesErrorValue.message);

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    isError: tasksError,
    error: tasksErrorValue,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ["customer-project-tasks", id],
    queryFn: async () =>
      requireApiResult(await tasksApi.getByProject(Number(id)), "Could not load project tasks") ??
      [],
    enabled: isLive && hasProjectAccess,
    staleTime: 10_000,
  });

  const averageProgress = tasks.length
    ? Math.round(
        tasks.reduce((total, task) => total + Number(task.actualProgressPct || 0), 0) /
          tasks.length,
      )
    : 0;
  const completedTasks = tasks.filter((task) => task.status === "COMPLETED").length;

  return (
    <div className="mx-auto max-w-[1400px]">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link to="/app/portal">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to portal
        </Link>
      </Button>

      {!isLive ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Sign in with a customer account to view assigned project details.
          </CardContent>
        </Card>
      ) : projectLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading project...</div>
      ) : projectError || !project ? (
        <Card className="shadow-sm">
          <QueryError
            message={projectErrorValue instanceof Error ? projectErrorValue.message : undefined}
            onRetry={() => refetchProject()}
          />
        </Card>
      ) : !hasProjectAccess ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            This project is not assigned to your customer account.
          </CardContent>
        </Card>
      ) : (
        <>
          <PageHeader
            section="Customer Project"
            title={project.projectName}
            description={project.address ?? "No address recorded"}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(healthConfig[STATUS_HEALTH[project.status] ?? "on-track"].cls)}
                >
                  {project.status.replaceAll("_", " ")}
                </Badge>
                <ProjectExportButton
                  projectId={project.projectId}
                  projectName={project.projectName}
                />
              </div>
            }
          />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              icon={CircleDollarSign}
              label="Budget"
              value={`${project.totalProjectBudget.toLocaleString()} ${project.currency}`}
            />
            <SummaryCard
              icon={CircleDollarSign}
              label="Actual cost"
              value={`${project.actualCost.toLocaleString()} ${project.currency}`}
            />
            <SummaryCard icon={ClipboardList} label="Tasks" value={String(tasks.length)} />
            <SummaryCard
              icon={CalendarDays}
              label="Progress"
              value={`${averageProgress}% overall`}
            />
            <SummaryCard
              icon={UserRound}
              label="Project Manager"
              value={project.pmName || `User #${project.pmUserID}`}
            />
          </div>

          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="budget">Budget</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Project baseline</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <OverviewItem label="Start" value={formatDate(project.startDate)} />
                    <OverviewItem
                      label="Baseline start"
                      value={formatDate(project.baselineStart)}
                    />
                    <OverviewItem label="Baseline end" value={formatDate(project.baselineEnd)} />
                    <OverviewItem label="Created" value={formatDate(project.createdDate)} />
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Completion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Average task progress</span>
                      <span className="font-semibold tabular-nums">{averageProgress}%</span>
                    </div>
                    <Progress value={averageProgress} className="mt-3 h-2" />
                    <p className="mt-3 text-xs text-muted-foreground">
                      {completedTasks}/{tasks.length} tasks completed.
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card className="mt-4 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Phases</CardTitle>
                </CardHeader>
                <CardContent>
                  {phasesLoading ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Loading phases...
                    </p>
                  ) : phasesForbidden ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Phase details aren&apos;t shared for this project yet.
                    </p>
                  ) : phasesError ? (
                    <QueryError
                      message={
                        phasesErrorValue instanceof Error ? phasesErrorValue.message : undefined
                      }
                      onRetry={() => refetchPhases()}
                    />
                  ) : phases.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No phases published for this project yet.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {phases.map((phase) => (
                        <li key={phase.phaseId} className="flex flex-wrap items-center gap-2 py-2.5">
                          <Badge variant="outline" className="tabular-nums">
                            #{phase.sequenceOrder}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{phase.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(phase.baselineStart)} → {formatDate(phase.baselineEnd)}
                            </p>
                          </div>
                          <Badge variant="outline">{phase.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="tasks">
              <CustomerTasksTable
                tasks={tasks}
                loading={tasksLoading}
                error={tasksError ? tasksErrorValue : null}
                onRetry={() => refetchTasks()}
              />
            </TabsContent>
            <TabsContent value="budget">
              <ProjectBudgetPanel
                projectId={project.projectId}
                budget={project.totalProjectBudget}
                currency={project.currency}
                plannedTaskBudget={project.plannedTaskBudget}
                reportedTaskActualCost={project.reportedTaskActualCost}
                purchaseOrderCommittedCost={project.purchaseOrderCommittedCost}
                purchaseOrderReceivedCost={project.purchaseOrderReceivedCost}
                remainingProcurementBudget={project.remainingProcurementBudget}
                canAdjust={false}
                canViewHistory={false}
                onUpdated={() => refetchProject()}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function CustomerTasksTable({
  tasks,
  loading,
  error,
  onRetry,
}: {
  tasks: TaskResponse[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading tasks...</div>;
  }

  if (error) {
    const raw = error instanceof Error ? error.message : "";
    // Customer phase/task reads are a backend follow-up: the phase routes still
    // authorize ADMIN/PM/WM only, so an assigned customer may get 403 here.
    if (/forbidden|403|access/i.test(raw)) {
      return (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Task details aren&apos;t shared for this project yet. Your project workbook export
            above still contains the full task list.
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="shadow-sm">
        <QueryError message={error instanceof Error ? error.message : undefined} onRetry={onRetry} />
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Phase</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead className="text-right">Progress</TableHead>
              <TableHead className="text-right">Planned budget</TableHead>
              <TableHead className="text-right">Actual cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No tasks have been published for this project yet.
                </TableCell>
              </TableRow>
            )}
            {tasks.map((task) => (
              <TableRow key={task.taskId}>
                <TableCell className="font-medium">
                  {task.taskName}
                  {(task.materialRequirements ?? []).length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {task.materialRequirements.length} planned material
                      {task.materialRequirements.length === 1 ? "" : "s"}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-sm">{task.phaseName}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={taskStatusClass(task.status)}>
                    {task.status.replaceAll("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(task.baselineStart)} - {formatDate(task.baselineEnd)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="ml-auto w-32">
                    <div className="mb-1 text-xs tabular-nums">
                      {Number(task.actualProgressPct || 0)}%
                    </div>
                    <Progress value={Number(task.actualProgressPct || 0)} className="h-1.5" />
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {task.plannedBudget.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {task.actualCost.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function isAssignedCustomerProject(project: ProjectResponse, userId?: number): boolean {
  if (!userId) return false;
  return project.customerUserID === userId;
}

function taskStatusClass(status: string): string {
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

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </div>
        <p className="mt-2 text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function OverviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
