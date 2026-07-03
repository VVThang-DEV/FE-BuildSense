import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, healthConfig } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { useSession } from "@/lib/session";
import { projectsApi } from "@/api/projects";
import { usersApi } from "@/api/users";

export const Route = createFileRoute("/app/projects")({
  head: () => ({ meta: [{ title: "Projects - BuildSense AI" }] }),
  component: ProjectsRoute,
});

const STATUS_HEALTH: Record<string, "on-track" | "at-risk" | "delayed"> = {
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

function addDays(value: string, days: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function ProjectsRoute() {
  const projectDetailMatch = useMatch({ from: "/app/projects/$id", shouldThrow: false });
  return projectDetailMatch ? <Outlet /> : <ProjectsList />;
}

function ProjectsList() {
  const session = useSession();
  const isLive = !!session?.token;
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ projectName: "", address: "", startDate: "", baselineEnd: "" });

  const { data: liveProjects, isLoading, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await projectsApi.getAll();
      if (!response.isSuccess) throw new Error(response.errorMessage ?? "Failed");
      return response.result ?? [];
    },
    enabled: isLive,
    staleTime: 30_000,
  });

  const submitCreate = async () => {
    if (!form.projectName.trim() || !form.startDate) {
      toast.error("Project name and start date are required");
      return;
    }

    const userIdResponse = await usersApi.getUserId();
    if (!userIdResponse.isSuccess || !userIdResponse.result) {
      toast.error(userIdResponse.errorMessage ?? "Could not resolve current user");
      return;
    }

    const response = await projectsApi.create({
      projectName: form.projectName.trim(),
      address: form.address.trim() || undefined,
      startDate: form.startDate,
      pmUserID: userIdResponse.result,
      baselineStart: form.startDate,
      baselineEnd: form.baselineEnd || addDays(form.startDate, 90),
    });

    if (response.isSuccess) {
      toast.success("Project created");
      setCreating(false);
      setForm({ projectName: "", address: "", startDate: "", baselineEnd: "" });
      refetch();
    } else {
      toast.error(response.errorMessage ?? "Create failed");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Overview"
        title="Projects"
        description="Active and planned construction projects from the backend."
        actions={
          isLive ? (
            <Button size="sm" className="h-8 text-xs" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New project
            </Button>
          ) : undefined
        }
      />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Project name</Label>
              <Input value={form.projectName} onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))} />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <Label>Start date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <Label>Baseline end</Label>
              <Input type="date" value={form.baselineEnd} onChange={(e) => setForm((f) => ({ ...f, baselineEnd: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={submitCreate}>Create project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {!isLive ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Sign in with a real backend account to view projects.</div>
          ) : isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading projects...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start date</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(liveProjects ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No projects yet</TableCell></TableRow>
                )}
                {(liveProjects ?? []).map((project) => (
                  <TableRow key={project.projectId}>
                    <TableCell className="font-medium">
                      <Link to="/app/projects/$id" params={{ id: String(project.projectId) }} className="hover:underline">
                        {project.projectName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{project.address ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(healthConfig[STATUS_HEALTH[project.status] ?? "on-track"].cls)}>
                        {project.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(project.startDate)}</TableCell>
                    <TableCell className="text-sm">{formatDate(project.createdDate)}</TableCell>
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
