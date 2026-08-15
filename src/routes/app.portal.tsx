import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { CalendarDays, CircleDollarSign, ClipboardList, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { projectsApi, type ProjectResponse } from "@/api/projects";
import { useSession } from "@/lib/session";
import { cn, healthConfig } from "@/lib/utils";

export const Route = createFileRoute("/app/portal")({
  head: () => ({ meta: [{ title: "Customer Portal - BuildSense AI" }] }),
  component: CustomerPortalRoute,
});

const STATUS_HEALTH: Record<string, keyof typeof healthConfig> = {
  PLANNING: "on-track",
  IN_PROGRESS: "on-track",
  COMPLETED: "on-track",
  DELAYED: "delayed",
  PAUSED: "at-risk",
  CANCELLED: "at-risk",
};

function CustomerPortalRoute() {
  const projectDetailMatch = useMatch({ from: "/app/portal/$id", shouldThrow: false });
  return projectDetailMatch ? <Outlet /> : <CustomerPortalList />;
}

function CustomerPortalList() {
  const session = useSession();
  const isLive = !!session?.token;

  const {
    data: projects = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["customer-projects", session?.userId],
    queryFn: async () =>
      requireApiResult(await projectsApi.getAll(), "Could not load your projects") ?? [],
    enabled: isLive,
    staleTime: 30_000,
  });

  const visibleProjects = projects.filter((project) =>
    isAssignedCustomerProject(project, session?.userId),
  );

  const activeCount = visibleProjects.filter((project) =>
    ["PLANNING", "IN_PROGRESS", "DELAYED", "PAUSED"].includes(project.status),
  ).length;
  const totalBudget = visibleProjects.reduce(
    (total, project) => total + project.totalProjectBudget,
    0,
  );
  const totalTasks = visibleProjects.reduce((total, project) => total + project.totalTasks, 0);
  const currency = visibleProjects[0]?.currency ?? "VND";

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        section="Portal"
        title="Customer Portal"
        description="Read-only access to the construction projects assigned to your account."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ClipboardList} label="Assigned projects" value={visibleProjects.length} />
        <MetricCard icon={CalendarDays} label="Active projects" value={activeCount} />
        <MetricCard icon={ClipboardList} label="Tracked tasks" value={totalTasks} />
        <MetricCard
          icon={CircleDollarSign}
          label="Total budget"
          value={`${totalBudget.toLocaleString()} ${currency}`}
        />
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {!isLive ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Sign in with a customer account to view assigned projects.
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading projects...</div>
          ) : isError ? (
            <QueryError
              message={error instanceof Error ? error.message : undefined}
              onRetry={() => refetch()}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Project Manager</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Baseline end</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleProjects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No projects are assigned to your customer account yet.
                    </TableCell>
                  </TableRow>
                )}
                {visibleProjects.map((project) => (
                  <TableRow key={project.projectId}>
                    <TableCell>
                      <Link
                        to="/app/portal/$id"
                        params={{ id: String(project.projectId) }}
                        className="font-medium hover:underline"
                      >
                        {project.projectName}
                      </Link>
                      <p className="text-xs text-muted-foreground">{project.address ?? "-"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          healthConfig[STATUS_HEALTH[project.status] ?? "on-track"].cls,
                        )}
                      >
                        {project.status.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {project.pmName || `User #${project.pmUserID}`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {project.totalProjectBudget.toLocaleString()} {project.currency}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(project.startDate)}</TableCell>
                    <TableCell className="text-sm">{formatDate(project.baselineEnd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function isAssignedCustomerProject(project: ProjectResponse, userId?: number): boolean {
  if (!userId) return false;
  return project.customerUserID === userId;
}

function formatDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: number | string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </div>
        <p className="mt-2 text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
