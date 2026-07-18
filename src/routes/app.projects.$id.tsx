import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, CircleDollarSign, ClipboardList, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, healthConfig } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ProjectTaskBoard } from "@/components/project-task-board";
import { ProjectMaterialPlanning } from "@/components/project-material-planning";
import { ProjectBudgetPanel } from "@/components/project-budget-panel";
import { useSession } from "@/lib/session";
import { projectsApi } from "@/api/projects";
import { usersApi } from "@/api/users";

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
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<"cancel" | "complete" | null>(null);
  const [managerId, setManagerId] = useState("");
  const [editForm, setEditForm] = useState({
    projectName: "",
    address: "",
    startDate: "",
    baselineStart: "",
    baselineEnd: "",
  });

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

  const managersQuery = useQuery({
    queryKey: ["users", "project-managers"],
    queryFn: async () => {
      const response = await usersApi.getAll();
      if (!response.isSuccess) throw new Error(response.errorMessage ?? "Could not load managers");
      return (response.result ?? []).filter((account) => account.role === "PM");
    },
    enabled: isLive && session?.role === "ADMIN" && reassignOpen,
    staleTime: 30_000,
  });

  const changeStatus = async (action: "start" | "pause" | "cancel" | "reopen" | "complete") => {
    if (!project) return;
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

  const openProjectEditor = () => {
    if (!project) return;
    setEditForm({
      projectName: project.projectName,
      address: project.address ?? "",
      startDate: project.startDate.slice(0, 10),
      baselineStart: project.baselineStart.slice(0, 10),
      baselineEnd: project.baselineEnd.slice(0, 10),
    });
    setEditOpen(true);
  };

  const submitProjectEdit = async () => {
    if (!project) return;
    if (
      !editForm.projectName.trim() ||
      !editForm.startDate ||
      !editForm.baselineStart ||
      !editForm.baselineEnd
    ) {
      toast.error("Project name and schedule dates are required");
      return;
    }
    if (new Date(editForm.baselineEnd) < new Date(editForm.baselineStart)) {
      toast.error("Baseline end cannot be before baseline start");
      return;
    }
    setSaving(true);
    try {
      const response = await projectsApi.update(project.projectId, {
        projectName: editForm.projectName.trim(),
        address: editForm.address.trim() || undefined,
        startDate: editForm.startDate,
        baselineStart: editForm.baselineStart,
        baselineEnd: editForm.baselineEnd,
        rowVersion: project.rowVersion,
      });
      if (!response.isSuccess) toast.error(response.errorMessage ?? "Could not update project");
      else {
        toast.success("Project updated");
        setEditOpen(false);
        await refetch();
      }
    } finally {
      setSaving(false);
    }
  };

  const openManagerDialog = () => {
    if (!project) return;
    setManagerId(String(project.pmUserID));
    setReassignOpen(true);
  };

  const reassignProjectManager = async () => {
    if (!project) return;
    const userId = Number(managerId);
    if (!Number.isInteger(userId) || userId <= 0) {
      toast.error("Select a Project Manager");
      return;
    }
    setSaving(true);
    try {
      const response = await projectsApi.reassignProjectManager(
        project.projectId,
        userId,
        project.rowVersion,
      );
      if (!response.isSuccess)
        toast.error(response.errorMessage ?? "Could not reassign Project Manager");
      else {
        toast.success("Project Manager reassigned");
        setReassignOpen(false);
        await refetch();
      }
    } finally {
      setSaving(false);
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
                      <Button size="sm" variant="outline" onClick={openProjectEditor}>
                        Edit
                      </Button>
                    )}
                    {session.role === "ADMIN" && (
                      <Button size="sm" variant="outline" onClick={openManagerDialog}>
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
                          onClick={() => setConfirmStatus("complete")}
                        >
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!!changingStatus}
                          onClick={() => setConfirmStatus("cancel")}
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

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
            <SummaryCard
              icon={UserRound}
              label="Project Manager"
              value={project.pmName || `User #${project.pmUserID}`}
            />
          </div>

          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="materials">Materials</TabsTrigger>
              <TabsTrigger value="budget">Budget</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Project baseline</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
                  <OverviewItem label="Start" value={formatDate(project.startDate)} />
                  <OverviewItem label="Baseline start" value={formatDate(project.baselineStart)} />
                  <OverviewItem label="Baseline end" value={formatDate(project.baselineEnd)} />
                  <OverviewItem label="Created" value={formatDate(project.createdDate)} />
                  <OverviewItem label="AI alerts" value={String(project.totalAIAlerts)} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="tasks">
              <ProjectTaskBoard projectId={project.projectId} projectName={project.projectName} />
            </TabsContent>
            <TabsContent value="materials">
              <ProjectMaterialPlanning projectId={project.projectId} />
            </TabsContent>
            <TabsContent value="budget">
              <ProjectBudgetPanel
                projectId={project.projectId}
                budget={project.totalProjectBudget}
                currency={project.currency}
                canAdjust={session?.role === "ADMIN"}
                canViewHistory={session?.role === "ADMIN" || session?.role === "PM"}
                onUpdated={() => refetch()}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-project-name">Project name</Label>
              <Input
                id="edit-project-name"
                value={editForm.projectName}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, projectName: event.target.value }))
                }
                maxLength={200}
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="edit-project-address">Address</Label>
              <Input
                id="edit-project-address"
                value={editForm.address}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, address: event.target.value }))
                }
                maxLength={500}
                disabled={saving}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="edit-project-start">Start date</Label>
                <Input
                  id="edit-project-start"
                  type="date"
                  value={editForm.startDate}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, startDate: event.target.value }))
                  }
                  disabled={saving}
                />
              </div>
              <div>
                <Label htmlFor="edit-project-baseline-start">Baseline start</Label>
                <Input
                  id="edit-project-baseline-start"
                  type="date"
                  value={editForm.baselineStart}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, baselineStart: event.target.value }))
                  }
                  disabled={saving}
                />
              </div>
              <div>
                <Label htmlFor="edit-project-baseline-end">Baseline end</Label>
                <Input
                  id="edit-project-baseline-end"
                  type="date"
                  min={editForm.baselineStart || undefined}
                  value={editForm.baselineEnd}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, baselineEnd: event.target.value }))
                  }
                  disabled={saving}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitProjectEdit} disabled={saving}>
              {saving ? "Saving..." : "Save project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Project Manager</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Project Manager</Label>
            <Select
              value={managerId}
              onValueChange={setManagerId}
              disabled={saving || managersQuery.isLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={managersQuery.isLoading ? "Loading managers..." : "Select manager"}
                />
              </SelectTrigger>
              <SelectContent>
                {(managersQuery.data ?? []).map((manager) => (
                  <SelectItem key={manager.id} value={String(manager.id)}>
                    {manager.firstName} {manager.lastName} ({manager.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {managersQuery.isError && (
              <p className="mt-2 text-sm text-destructive">
                {managersQuery.error instanceof Error
                  ? managersQuery.error.message
                  : "Could not load Project Managers"}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={reassignProjectManager} disabled={saving || !managerId}>
              {saving ? "Reassigning..." : "Reassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmStatus !== null}
        onOpenChange={(open) => !open && setConfirmStatus(null)}
        title={`${confirmStatus === "complete" ? "Complete" : "Cancel"} this project?`}
        description={
          confirmStatus === "complete"
            ? "The project will be closed as completed. Confirm that all required work and reporting are finished."
            : "The project will be cancelled and active operational workflows will be closed."
        }
        confirmLabel={confirmStatus === "complete" ? "Complete project" : "Cancel project"}
        destructive={confirmStatus === "cancel"}
        busy={changingStatus !== null}
        onConfirm={async () => {
          if (!confirmStatus) return;
          await changeStatus(confirmStatus);
          setConfirmStatus(null);
        }}
      />
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

function OverviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
