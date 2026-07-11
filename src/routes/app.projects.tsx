import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { FileUp, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, healthConfig } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { useSession } from "@/lib/session";
import { projectsApi } from "@/api/projects";
import { requireApiResult } from "@/api/client";

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
  const canManageProjects = session?.role === "PM";
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    projectName: "",
    address: "",
    startDate: "",
    baselineEnd: "",
  });

  const {
    data: liveProjects,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await projectsApi.getAll();
      return requireApiResult(response, "Could not load projects") ?? [];
    },
    enabled: isLive,
    staleTime: 30_000,
  });

  const submitCreate = async () => {
    if (!form.projectName.trim() || !form.startDate) {
      toast.error("Project name and start date are required");
      return;
    }

    if (form.baselineEnd && form.baselineEnd < form.startDate) {
      toast.error("Baseline end must be on or after the start date");
      return;
    }

    if (!session?.userId) {
      toast.error("Could not resolve the signed-in Project Manager");
      return;
    }

    setSaving(true);
    try {
      const response = await projectsApi.create({
        projectName: form.projectName.trim(),
        address: form.address.trim() || undefined,
        startDate: form.startDate,
        pmUserID: session.userId,
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
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setSaving(false);
    }
  };

  const closeImportDialog = () => {
    if (importing) return;
    setImportDialogOpen(false);
    setImportFile(null);
  };

  const submitImport = async () => {
    if (!importFile) {
      toast.error("Choose a Word document first");
      return;
    }

    if (!importFile.name.toLowerCase().endsWith(".docx")) {
      toast.error("Only .docx Word documents are supported");
      return;
    }

    if (importFile.size > 10 * 1024 * 1024) {
      toast.error("The Word document must be 10 MB or smaller");
      return;
    }

    setImporting(true);
    try {
      const response = await projectsApi.importFromWord(importFile);
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Project import failed");
        return;
      }

      toast.success(
        response.result?.projectName
          ? `Imported ${response.result.projectName}`
          : "Project imported",
      );
      setImportDialogOpen(false);
      setImportFile(null);
      await refetch();
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Overview"
        title="Projects"
        description="Active and planned construction projects from the backend."
        actions={
          isLive && canManageProjects ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setImportDialogOpen(true)}
              >
                <FileUp className="mr-1 h-3.5 w-3.5" /> Import Word
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={() => setCreating(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> New project
              </Button>
            </div>
          ) : undefined
        }
      />

      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          if (open) setImportDialogOpen(true);
          else closeImportDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import project from Word</DialogTitle>
            <DialogDescription>
              Upload a structured .docx document. The backend will extract the project details and
              create the project for your account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-word-file">Word document</Label>
              <Input
                id="project-word-file"
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                disabled={importing}
                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">DOCX only, up to 10 MB.</p>
            </div>

            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Required document labels</p>
              <div className="space-y-1 font-mono">
                <p>Tên dự án: ...</p>
                <p>Địa điểm: ...</p>
                <p>Ngân sách tổng: ...</p>
                <p>Tiền tệ: VND</p>
                <p>Ngày thực tế bắt đầu: 2026-07-15</p>
                <p>Ngày kế hoạch bắt đầu: 2026-07-15</p>
                <p>Ngày kế hoạch kết thúc: 2027-02-28</p>
              </div>
              <p className="mt-2">Use YYYY-MM-DD for reliable date parsing.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeImportDialog} disabled={importing}>
              Cancel
            </Button>
            <Button onClick={submitImport} disabled={importing || !importFile}>
              {importing ? "Importing..." : "Import project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={form.projectName}
                onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="project-address">Address</Label>
              <Input
                id="project-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="project-start">Start date</Label>
              <Input
                id="project-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="project-end">Baseline end</Label>
              <Input
                id="project-end"
                type="date"
                min={form.startDate || undefined}
                value={form.baselineEnd}
                onChange={(e) => setForm((f) => ({ ...f, baselineEnd: e.target.value }))}
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={saving}>
              {saving ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {!isLive ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Sign in with a real backend account to view projects.
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
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start date</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(liveProjects ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No projects yet
                    </TableCell>
                  </TableRow>
                )}
                {(liveProjects ?? []).map((project) => (
                  <TableRow key={project.projectId}>
                    <TableCell className="font-medium">
                      <Link
                        to="/app/projects/$id"
                        params={{ id: String(project.projectId) }}
                        className="hover:underline"
                      >
                        {project.projectName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {project.address ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          healthConfig[STATUS_HEALTH[project.status] ?? "on-track"].cls,
                        )}
                      >
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
