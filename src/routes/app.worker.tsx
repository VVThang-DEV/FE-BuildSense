import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { TaskIssues } from "@/components/task-issues";
import { requireApiResult } from "@/api/client";
import { projectsApi } from "@/api/projects";
import { tasksApi } from "@/api/tasks";
import { progressReportsApi } from "@/api/progressReports";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/app/worker")({
  head: () => ({ meta: [{ title: "My Tasks - BuildSense AI" }] }),
  component: WorkerWorkspace,
});

const REPORT_INTERVAL_MS = 15 * 60 * 1000;

function formatDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function taskStatusClass(status: string): string {
  if (status === "COMPLETED") return "border-success/30 bg-success/10 text-success";
  if (status === "ACTIVE" || status === "IN_PROGRESS")
    return "border-primary/30 bg-primary/10 text-primary";
  if (status === "REJECTED" || status === "CANCELLED")
    return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-warning/35 bg-warning/10 text-warning-foreground";
}

// Minimal site-worker workspace: assigned tasks only, plus a minimal project
// header (name/address/dates — never budget). Everything else is 403.
function WorkerWorkspace() {
  const session = useSession();
  const isWorker = session?.role === "WORKER";
  const isLive = !!session?.token;
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [progressIncrement, setProgressIncrement] = useState("5");
  const [actualCostIncrement, setActualCostIncrement] = useState("0");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    data: tasks = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["worker-tasks"],
    queryFn: async () =>
      requireApiResult(await tasksApi.getAssigned(), "Could not load assigned tasks") ?? [],
    enabled: isLive && isWorker,
    staleTime: 10_000,
  });

  const {
    data: selectedTask,
    isLoading: detailLoading,
    isError: detailError,
    error: detailErrorValue,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ["worker-task", selectedTaskId],
    queryFn: async () =>
      requireApiResult(await tasksApi.getById(selectedTaskId!), "Could not load task"),
    enabled: selectedTaskId !== null,
    staleTime: 10_000,
  });

  const projectId = selectedTask?.projectId ?? 0;
  const { data: projectHeader } = useQuery({
    queryKey: ["worker-project-context", projectId],
    queryFn: async () =>
      requireApiResult(await projectsApi.getContext(projectId), "Could not load project"),
    enabled: projectId > 0,
    staleTime: 60_000,
  });

  const {
    data: reports = [],
    isLoading: reportsLoading,
    isError: reportsError,
    error: reportsErrorValue,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ["worker-task-reports", selectedTaskId],
    queryFn: async () =>
      requireApiResult(
        await progressReportsApi.getByTask(selectedTaskId!),
        "Could not load progress reports",
      ) ?? [],
    enabled: selectedTaskId !== null,
    staleTime: 10_000,
  });

  const remaining = selectedTask
    ? Math.max(0, 100 - Number(selectedTask.actualProgressPct || 0))
    : 0;
  const pendingReport = reports.find((report) => report.status === "PENDING");
  const recentReport = reports.find(
    (report) =>
      Date.now() - new Date(report.reportDate).getTime() < REPORT_INTERVAL_MS,
  );
  const canSubmit =
    !!selectedTask && remaining > 0 && !pendingReport && !recentReport && !reportsLoading;

  const submitReport = async () => {
    if (!selectedTask) return;
    const progress = Number(progressIncrement);
    const cost = Number(actualCostIncrement);
    if (!Number.isFinite(progress) || progress <= 0) {
      toast.error("Progress increment must be greater than 0");
      return;
    }
    if (progress > remaining) {
      toast.error(`Only ${remaining}% progress remains for this task`);
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      toast.error("Actual cost increment must be 0 or greater");
      return;
    }
    setSubmitting(true);
    try {
      const response = await progressReportsApi.create({
        taskId: selectedTask.taskId,
        progressIncrement: progress,
        actualCostIncrement: cost,
        notes: notes.trim() || undefined,
      });
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Could not submit report");
        return;
      }
      toast.success("Report sent for PM approval");
      setProgressIncrement("5");
      setActualCostIncrement("0");
      setNotes("");
      await refetchReports();
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLive || !isWorker) {
    return (
      <div className="mx-auto max-w-[1200px]">
        <PageHeader section="Site Work" title="My Tasks" description="Assigned site work." />
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Sign in with a site-worker account to view assigned tasks.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        section="Site Work"
        title="My Tasks"
        description="Tasks assigned to you. Submit progress reports for PM approval."
      />

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading tasks...</div>
          ) : isError ? (
            <QueryError
              message={error instanceof Error ? error.message : undefined}
              onRetry={() => refetch()}
            />
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No tasks assigned to you right now.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.taskId}>
                    <TableCell className="font-medium">
                      {task.taskName}
                      <p className="text-xs font-normal text-muted-foreground">
                        {task.assignedToUserName || ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">{task.phaseName}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDate(task.baselineStart)} → {formatDate(task.baselineEnd)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="ml-auto w-28">
                        <p className="mb-1 text-xs tabular-nums">
                          {Number(task.actualProgressPct || 0)}%
                        </p>
                        <Progress value={Number(task.actualProgressPct || 0)} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => setSelectedTaskId(task.taskId)}
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" /> Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={selectedTaskId !== null} onOpenChange={(open) => !open && setSelectedTaskId(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.taskName ?? "Task detail"}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading task...</div>
          ) : detailError || !selectedTask ? (
            <QueryError
              message={detailErrorValue instanceof Error ? detailErrorValue.message : undefined}
              onRetry={() => refetchDetail()}
            />
          ) : (
            <div className="space-y-4">
              {projectHeader && (
                <div className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Project</p>
                    <p className="font-medium">{projectHeader.projectName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="font-medium">{projectHeader.address || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Schedule</p>
                    <p className="font-medium">
                      {formatDate(projectHeader.baselineStart)} →{" "}
                      {formatDate(projectHeader.baselineEnd)}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Phase</p>
                  <p className="font-medium">{selectedTask.phaseName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className="mt-0.5">
                    {selectedTask.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Task baseline</p>
                  <p className="font-medium">
                    {formatDate(selectedTask.baselineStart)} →{" "}
                    {formatDate(selectedTask.baselineEnd)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Progress</p>
                  <p className="font-medium tabular-nums">
                    {Number(selectedTask.actualProgressPct || 0)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Planned budget</p>
                  <p className="font-medium tabular-nums">
                    {Number(selectedTask.plannedBudget || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Actual cost</p>
                  <p className="font-medium tabular-nums">
                    {Number(selectedTask.actualCost || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-medium">Submit progress report</p>
                {pendingReport ? (
                  <p className="text-xs text-muted-foreground">
                    A report is awaiting PM review — you can submit again after it is approved or
                    rejected.
                  </p>
                ) : recentReport ? (
                  <p className="text-xs text-muted-foreground">
                    A report was submitted recently — wait a few minutes before the next one.
                  </p>
                ) : remaining <= 0 ? (
                  <p className="text-xs text-muted-foreground">This task is at 100%.</p>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="worker-progress">Progress completed (%)</Label>
                        <Input
                          id="worker-progress"
                          type="number"
                          min="0.01"
                          max={remaining}
                          step="0.01"
                          value={progressIncrement}
                          onChange={(event) => setProgressIncrement(event.target.value)}
                          disabled={submitting}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Remaining: {remaining}%
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="worker-cost">Actual cost added</Label>
                        <Input
                          id="worker-cost"
                          type="number"
                          min="0"
                          step="0.01"
                          value={actualCostIncrement}
                          onChange={(event) => setActualCostIncrement(event.target.value)}
                          disabled={submitting}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="worker-notes">Notes</Label>
                      <Textarea
                        id="worker-notes"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        maxLength={1000}
                        disabled={submitting}
                      />
                    </div>
                  </>
                )}
              </div>

              {reportsLoading ? (
                <p className="text-xs text-muted-foreground">Loading report history...</p>
              ) : reportsError ? (
                <QueryError
                  message={
                    reportsErrorValue instanceof Error ? reportsErrorValue.message : undefined
                  }
                  onRetry={() => refetchReports()}
                />
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Increment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>PM feedback</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                            No reports yet.
                          </TableCell>
                        </TableRow>
                      )}
                      {reports.map((report) => (
                        <TableRow key={report.reportId}>
                          <TableCell className="text-xs">
                            {formatDate(report.reportDate)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {report.progressIncrement}%
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{report.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {report.reviewNote || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <TaskIssues taskId={selectedTask.taskId} canReport canResolve={false} />
            </div>
          )}
          <DialogFooter>
            {canSubmit && (
              <Button onClick={submitReport} disabled={submitting}>
                {submitting ? "Sending..." : "Send for PM approval"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedTaskId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
