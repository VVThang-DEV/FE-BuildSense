import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { ProjectTaskBoard } from "@/components/project-task-board";
import { QueryError } from "@/components/query-error";
import { requireApiResult } from "@/api/client";
import { projectsApi } from "@/api/projects";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/app/site/report")({
  head: () => ({ meta: [{ title: "Daily Progress - BuildSense AI" }] }),
  component: DailyProgressPage,
});

function DailyProgressPage() {
  const session = useSession();
  const [projectId, setProjectId] = useState("");

  const {
    data: projects = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: async () =>
      requireApiResult(await projectsApi.getAll(), "Could not load projects") ?? [],
    enabled: !!session?.token,
    staleTime: 30_000,
  });

  const accessibleProjects = useMemo(() => {
    if (session?.role === "PM") {
      return projects.filter((project) => project.pmUserID === session.userId);
    }
    return projects;
  }, [projects, session?.role, session?.userId]);

  const selectedProject = accessibleProjects.find(
    (project) => project.projectId === Number(projectId),
  );

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        section="Field"
        title="Daily Progress"
        description="Create project tasks, submit progress increments, and review report history."
      />

      <Card className="mb-4 shadow-sm">
        <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <Label id="progress-project-label">Project</Label>
            <Select
              value={projectId}
              onValueChange={setProjectId}
              disabled={isLoading || accessibleProjects.length === 0}
            >
              <SelectTrigger aria-labelledby="progress-project-label">
                <SelectValue placeholder={isLoading ? "Loading projects..." : "Select project"} />
              </SelectTrigger>
              <SelectContent>
                {accessibleProjects.map((project) => (
                  <SelectItem key={project.projectId} value={String(project.projectId)}>
                    {project.projectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground">
            <ClipboardList className="h-4 w-4" />
            {selectedProject ? "Task board loaded" : "Choose a project to continue"}
          </div>
        </CardContent>
      </Card>

      {isError ? (
        <Card className="shadow-sm">
          <QueryError
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        </Card>
      ) : !selectedProject ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {accessibleProjects.length === 0 && !isLoading
              ? "No accessible projects found for this account."
              : "Select a project to view tasks and progress reports."}
          </CardContent>
        </Card>
      ) : (
        <ProjectTaskBoard
          projectId={selectedProject.projectId}
          projectName={selectedProject.projectName}
        />
      )}
    </div>
  );
}
