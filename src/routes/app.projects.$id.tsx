import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, CircleDollarSign, ClipboardList, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, healthConfig } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { ProjectTaskBoard } from "@/components/project-task-board";
import { ProjectMaterialPlanning } from "@/components/project-material-planning";
import { ProjectBudgetPanel } from "@/components/project-budget-panel";
import { useSession } from "@/lib/session";
import { projectsApi } from "@/api/projects";

const STATUS_HEALTH: Record<string, keyof typeof healthConfig> = {
  PLANNING: "on-track",
  IN_PROGRESS: "on-track",
  COMPLETED: "on-track",
  DELAYED: "delayed",
  PAUSED: "at-risk",
  CANCELLED: "at-risk",
};

function formatDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

export const Route = createFileRoute("/app/projects/$id")({
  head: () => ({ meta: [{ title: "Project - BuildSense AI" }] }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const session = useSession();
  const isLive = !!session?.token;
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  const {
    data: project,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const response = await projectsApi.getById(Number(id));
      if (!response.isSuccess) throw new Error(response.errorMessage ?? "Failed");
      return response.result;
    },
    enabled: isLive,
    staleTime: 30_000,
  });

  const changeStatus = async (action: "start" | "pause" | "cancel" | "reopen" | "complete") => {
    if (!project) return;
    if (
      (action === "cancel" || action === "complete") &&
      !window.confirm(`${action} this project?`)
    )
      return;
    setChangingStatus(action);
    try {
      const response = await projectsApi.changeStatus(
        project.projectId,
        action,
        project.rowVersion,
      );
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? `Could not ${action} project`);
        if (response.statusCode === 409) await refetch();
        return;
      }
      toast.success(`Project ${action} action completed`);
      await refetch();
    } finally {
      setChangingStatus(null);
    }
  };

  const editProject = async () => {
    if (!project) return;
    const projectName = window.prompt("Project name", project.projectName);
    if (projectName === null) return;
    const address = window.prompt("Address", project.address ?? "");
    if (address === null) return;
    const startDate = window.prompt("Start date (YYYY-MM-DD)", project.startDate.slice(0, 10));
    const baselineStart = window.prompt(
      "Baseline start (YYYY-MM-DD)",
      project.baselineStart.slice(0, 10),
    );
    const baselineEnd = window.prompt(
      "Baseline end (YYYY-MM-DD)",
      project.baselineEnd.slice(0, 10),
    );
    if (!startDate || !baselineStart || !baselineEnd) return;
    const response = await projectsApi.update(project.projectId, {
      projectName,
      address: address || undefined,
      startDate,
      baselineStart,
      baselineEnd,
      rowVersion: project.rowVersion,
    });
    if (!response.isSuccess) toast.error(response.errorMessage ?? "Could not update project");
    else {
      toast.success("Project updated");
      await refetch();
    }
  };

  const reassignProjectManager = async () => {
    if (!project) return;
    const value = window.prompt("New Project Manager user ID", String(project.pmUserID));
    if (value === null) return;
    const userId = Number(value);
    if (!Number.isInteger(userId) || userId <= 0) {
      toast.error("Enter a positive user ID");
      return;
    }
    const response = await projectsApi.reassignProjectManager(
      project.projectId,
      userId,
      project.rowVersion,
    );
    if (!response.isSuccess)
      toast.error(response.errorMessage ?? "Could not reassign Project Manager");
    else {
      toast.success("Project Manager reassigned");
      await refetch();
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link to="/app/projects">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to projects
        </Link>
      </Button>

      {!isLive ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Sign in with a real backend account to view project details.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading project...</div>
      ) : error || !project ? (
        <Card className="shadow-sm">
          <QueryError
            message={error instanceof Error ? error.message : "Project not found"}
            onRetry={() => refetch()}
          />
        </Card>
      ) : (
        <>
          <PageHeader
            section="Project Detail"
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
                {(session?.role === "PM" || session?.role === "ADMIN") && (
                  <>
                    {session.role === "PM" && (
                      <Button size="sm" variant="outline" onClick={editProject}>
                        Edit
                      </Button>
                    )}
                    {session.role === "ADMIN" && (
                      <Button size="sm" variant="outline" onClick={reassignProjectManager}>
                        Reassign PM
                      </Button>
                    )}
                    {project.status === "PLANNING" && (
                      <Button
                        size="sm"
                        disabled={!!changingStatus}
                        onClick={() => changeStatus("start")}
                      >
                        Start
                      </Button>
                    )}
                    {(project.status === "IN_PROGRESS" || project.status === "DELAYED") && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!!changingStatus}
                        onClick={() => changeStatus("pause")}
                      >
                        Pause
                      </Button>
                    )}
                    {(project.status === "PAUSED" || project.status === "CANCELLED") && (
                      <Button
                        size="sm"
                        disabled={!!changingStatus}
                        onClick={() => changeStatus("reopen")}
                      >
                        Reopen
                      </Button>
                    )}
                    {project.status !== "COMPLETED" && project.status !== "CANCELLED" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!!changingStatus}
                          onClick={() => changeStatus("complete")}
                        >
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!!changingStatus}
                          onClick={() => changeStatus("cancel")}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            }
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={CalendarDays}
              label="Start date"
              value={formatDate(project.startDate)}
            />
            <SummaryCard
              icon={CalendarDays}
              label="Baseline end"
              value={formatDate(project.baselineEnd)}
            />
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
            <SummaryCard icon={ClipboardList} label="Tasks" value={String(project.totalTasks)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2 mt-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Schedule</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <InfoRow label="Start date" value={formatDate(project.startDate)} />
                <InfoRow label="Baseline start" value={formatDate(project.baselineStart)} />
                <InfoRow label="Baseline end" value={formatDate(project.baselineEnd)} />
                <InfoRow label="Created" value={formatDate(project.createdDate)} />
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ownership</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <InfoRow label="PM user ID" value={String(project.pmUserID || "-")} />
                <InfoRow label="PM name" value={project.pmName || "-"} />
                <InfoRow label="AI alerts" value={String(project.totalAIAlerts)} />
                <div className="flex items-center gap-2 rounded-md border p-3 text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                  <span>Tasks and daily progress are now connected below.</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4">
            <ProjectTaskBoard projectId={project.projectId} projectName={project.projectName} />
          </div>
          <ProjectBudgetPanel
            projectId={project.projectId}
            budget={project.totalProjectBudget}
            currency={project.currency}
            canAdjust={session?.role === "ADMIN"}
            onUpdated={() => refetch()}
          />
          <ProjectMaterialPlanning projectId={project.projectId} />
        </>
      )}
    </div>
  );
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
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Icon className="h-4 w-4" />
          {label}
        </div>
        <p className="mt-2 text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
