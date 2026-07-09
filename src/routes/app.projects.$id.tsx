import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, CircleDollarSign, ClipboardList, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, healthConfig } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { useSession } from "@/lib/session";
import { projectsApi } from "@/api/projects";

const STATUS_HEALTH: Record<string, keyof typeof healthConfig> = {
  PLANNING: "on-track",
  IN_PROGRESS: "on-track",
  COMPLETED: "on-track",
  DELAYED: "delayed",
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
              <Badge
                variant="outline"
                className={cn(healthConfig[STATUS_HEALTH[project.status] ?? "on-track"].cls)}
              >
                {project.status.replace("_", " ")}
              </Badge>
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
                  <span>
                    Team, WBS, documents, and material plans need backend endpoints before they can
                    be shown here.
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
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
