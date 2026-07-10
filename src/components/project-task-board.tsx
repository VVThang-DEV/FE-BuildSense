import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart3, Eye, Plus, Send } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { requireApiResult } from "@/api/client";
import { progressReportsApi } from "@/api/progressReports";
import { type TaskResponse, tasksApi } from "@/api/tasks";
import { usersApi } from "@/api/users";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { QueryError } from "./query-error";

type ProjectTaskBoardProps = {
  projectId: number;
  projectName?: string;
};

type TaskForm = {
  phaseName: string;
  taskName: string;
  assignedToUserID: string;
  plannedBudget: string;
  baselineStart: string;
  baselineEnd: string;
};

type ReportForm = {
  progressIncrement: string;
  notes: string;
  sitePhotoUrl: string;
};

const todayInput = () => new Date().toISOString().slice(0, 10);

function plusDaysInput(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function newTaskForm(): TaskForm {
  return {
    phaseName: "",
    taskName: "",
    assignedToUserID: "",
    plannedBudget: "0",
    baselineStart: todayInput(),
    baselineEnd: plusDaysInput(7),
  };
}

const initialReportForm: ReportForm = {
  progressIncrement: "5",
  notes: "",
  sitePhotoUrl: "",
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function responseMessage(result: unknown, fallback: string): string {
  return typeof result === "string" && result.trim() ? result : fallback;
}

function statusClass(status: string): string {
  if (status === "COMPLETED") return "border-success/30 bg-success/10 text-success";
  if (status === "ACTIVE") return "border-primary/30 bg-primary/10 text-primary";
  return "border-warning/35 bg-warning/10 text-warning-foreground";
}

export function ProjectTaskBoard({ projectId, projectName }: ProjectTaskBoardProps) {
  const session = useSession();
  const canManageTasks = session?.role === "ADMIN" || session?.role === "PM";
  const [taskForm, setTaskForm] = useState<TaskForm>(() => newTaskForm());
  const [reportForm, setReportForm] = useState<ReportForm>(initialReportForm);
  const [creatingTask, setCreatingTask] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    isError: tasksError,
    error: tasksErrorValue,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () =>
      requireApiResult(await tasksApi.getByProject(projectId), "Could not load project tasks") ??
      [],
    enabled: !!session?.token && projectId > 0,
    staleTime: 10_000,
  });

  const {
    data: users = [],
    isError: usersError,
    error: usersErrorValue,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async () => requireApiResult(await usersApi.getAll(), "Could not load users") ?? [],
    enabled: !!session?.token && canManageTasks,
    staleTime: 30_000,
  });

  const selectedTask = useMemo(
    () => tasks.find((task) => task.taskId === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );

  const {
    data: reports = [],
    isLoading: reportsLoading,
    isError: reportsError,
    error: reportsErrorValue,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ["progress-reports", selectedTaskId],
    queryFn: async () =>
      requireApiResult(
        await progressReportsApi.getByTask(selectedTaskId!),
        "Could not load progress reports",
      ) ?? [],
    enabled: selectedTaskId !== null,
    staleTime: 10_000,
  });

  const completedCount = tasks.filter((task) => task.status === "COMPLETED").length;
  const averageProgress = tasks.length
    ? Math.round(
        tasks.reduce((total, task) => total + Number(task.actualProgressPct || 0), 0) /
          tasks.length,
      )
    : 0;
  const selectedRemaining = selectedTask
    ? Math.max(0, 100 - Number(selectedTask.actualProgressPct || 0))
    : 0;
  const canReportSelected =
    !!selectedTask &&
    selectedRemaining > 0 &&
    (canManageTasks || selectedTask.assignedToUserID === session?.userId);

  const submitTask = async () => {
    if (!taskForm.phaseName.trim() || !taskForm.taskName.trim()) {
      toast.error("Phase and task name are required");
      return;
    }
    if (Number(taskForm.assignedToUserID) <= 0) {
      toast.error("Assigned user is required");
      return;
    }
    if (!taskForm.baselineStart || !taskForm.baselineEnd) {
      toast.error("Baseline dates are required");
      return;
    }
    if (new Date(taskForm.baselineEnd) < new Date(taskForm.baselineStart)) {
      toast.error("Baseline end cannot be before baseline start");
      return;
    }

    setCreatingTask(true);
    try {
      const response = await tasksApi.create({
        projectId,
        phaseName: taskForm.phaseName.trim(),
        taskName: taskForm.taskName.trim(),
        assignedToUserID: Number(taskForm.assignedToUserID),
        plannedBudget: Number(taskForm.plannedBudget) || 0,
        baselineStart: `${taskForm.baselineStart}T00:00:00.000Z`,
        baselineEnd: `${taskForm.baselineEnd}T00:00:00.000Z`,
      });

      if (response.isSuccess) {
        toast.success(responseMessage(response.result, "Task created"));
        setTaskForm(newTaskForm());
        refetchTasks();
      } else {
        toast.error(
          response.errorMessage ?? responseMessage(response.result, "Could not create task"),
        );
      }
    } catch {
      toast.error("Could not reach the backend. Check the API server and try again.");
    } finally {
      setCreatingTask(false);
    }
  };

  const submitReport = async () => {
    if (!selectedTask) return;
    const progressIncrement = Number(reportForm.progressIncrement);
    if (progressIncrement <= 0) {
      toast.error("Progress increment must be greater than 0");
      return;
    }
    if (progressIncrement > selectedRemaining) {
      toast.error(`Only ${selectedRemaining}% progress remains for this task`);
      return;
    }

    setSubmittingReport(true);
    try {
      const response = await progressReportsApi.create({
        taskId: selectedTask.taskId,
        progressIncrement,
        notes: reportForm.notes.trim() || undefined,
        sitePhotoUrl: reportForm.sitePhotoUrl.trim() || undefined,
      });

      if (response.isSuccess) {
        toast.success(responseMessage(response.result, "Progress report submitted"));
        setReportForm(initialReportForm);
        await refetchTasks();
        await refetchReports();
      } else {
        toast.error(
          response.errorMessage ?? responseMessage(response.result, "Could not submit report"),
        );
      }
    } catch {
      toast.error("Could not reach the backend. Check the API server and try again.");
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <TaskMetric label="Tasks" value={String(tasks.length)} />
        <TaskMetric label="Completed" value={String(completedCount)} />
        <TaskMetric label="Average progress" value={`${averageProgress}%`} />
      </div>

      {canManageTasks && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Create project task</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {usersError && (
              <QueryError
                message={
                  usersErrorValue instanceof Error
                    ? `${usersErrorValue.message}. You can still enter the assigned user ID manually.`
                    : "Could not load users. You can still enter the assigned user ID manually."
                }
                onRetry={() => refetchUsers()}
              />
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="task-phase">Phase</Label>
                <Input
                  id="task-phase"
                  placeholder="Foundation"
                  value={taskForm.phaseName}
                  onChange={(event) =>
                    setTaskForm((current) => ({ ...current, phaseName: event.target.value }))
                  }
                  disabled={creatingTask}
                />
              </div>
              <div>
                <Label htmlFor="task-name">Task name</Label>
                <Input
                  id="task-name"
                  placeholder="Pour footing concrete"
                  value={taskForm.taskName}
                  onChange={(event) =>
                    setTaskForm((current) => ({ ...current, taskName: event.target.value }))
                  }
                  disabled={creatingTask}
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label id="task-assignee-label">Assigned user</Label>
                {users.length > 0 ? (
                  <Select
                    value={taskForm.assignedToUserID}
                    onValueChange={(value) =>
                      setTaskForm((current) => ({ ...current, assignedToUserID: value }))
                    }
                    disabled={creatingTask}
                  >
                    <SelectTrigger aria-labelledby="task-assignee-label">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.lastName} {user.firstName} · {user.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    aria-labelledby="task-assignee-label"
                    type="number"
                    min="1"
                    placeholder="User ID"
                    value={taskForm.assignedToUserID}
                    onChange={(event) =>
                      setTaskForm((current) => ({
                        ...current,
                        assignedToUserID: event.target.value,
                      }))
                    }
                    disabled={creatingTask}
                  />
                )}
              </div>
              <div>
                <Label htmlFor="task-budget">Planned budget</Label>
                <Input
                  id="task-budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={taskForm.plannedBudget}
                  onChange={(event) =>
                    setTaskForm((current) => ({ ...current, plannedBudget: event.target.value }))
                  }
                  disabled={creatingTask}
                />
              </div>
              <div>
                <Label htmlFor="task-start">Baseline start</Label>
                <Input
                  id="task-start"
                  type="date"
                  value={taskForm.baselineStart}
                  onChange={(event) =>
                    setTaskForm((current) => ({ ...current, baselineStart: event.target.value }))
                  }
                  disabled={creatingTask}
                />
              </div>
              <div>
                <Label htmlFor="task-end">Baseline end</Label>
                <Input
                  id="task-end"
                  type="date"
                  min={taskForm.baselineStart}
                  value={taskForm.baselineEnd}
                  onChange={(event) =>
                    setTaskForm((current) => ({ ...current, baselineEnd: event.target.value }))
                  }
                  disabled={creatingTask}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={submitTask} disabled={creatingTask}>
                <Plus className="mr-1.5 h-4 w-4" />
                {creatingTask ? "Creating..." : "Create task"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">
            {projectName ? `${projectName} tasks` : "Project tasks"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tasksLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading tasks...</div>
          ) : tasksError ? (
            <QueryError
              message={tasksErrorValue instanceof Error ? tasksErrorValue.message : undefined}
              onRetry={() => refetchTasks()}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Reports</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No tasks yet for this project.
                    </TableCell>
                  </TableRow>
                )}
                {tasks.map((task) => (
                  <TableRow key={task.taskId}>
                    <TableCell>
                      <p className="font-medium">{task.taskName}</p>
                      <p className="text-xs text-muted-foreground">{task.phaseName}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {task.assignedToUserName || `User #${task.assignedToUserID}`}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(task.baselineStart)} → {formatDate(task.baselineEnd)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatMoney(task.plannedBudget)}
                    </TableCell>
                    <TableCell className="min-w-36">
                      <div className="flex items-center gap-2">
                        <Progress value={Number(task.actualProgressPct || 0)} />
                        <span className="w-10 text-right text-xs tabular-nums">
                          {Number(task.actualProgressPct || 0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(statusClass(task.status))}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => setSelectedTaskId(task.taskId)}
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={selectedTaskId !== null}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedTask?.taskName ?? "Task progress"}</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-3">
                <InfoBlock label="Phase" value={selectedTask.phaseName} />
                <InfoBlock
                  label="Assigned"
                  value={
                    selectedTask.assignedToUserName || `User #${selectedTask.assignedToUserID}`
                  }
                />
                <InfoBlock label="Remaining" value={`${selectedRemaining}%`} />
              </div>

              {canReportSelected && (
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">Submit progress report</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
                    <div>
                      <Label htmlFor="progress-increment">Progress +%</Label>
                      <Input
                        id="progress-increment"
                        type="number"
                        min="0.01"
                        max={selectedRemaining}
                        step="0.01"
                        value={reportForm.progressIncrement}
                        onChange={(event) =>
                          setReportForm((current) => ({
                            ...current,
                            progressIncrement: event.target.value,
                          }))
                        }
                        disabled={submittingReport}
                      />
                    </div>
                    <div>
                      <Label htmlFor="photo-url">Site photo URL</Label>
                      <Input
                        id="photo-url"
                        placeholder="https://..."
                        value={reportForm.sitePhotoUrl}
                        onChange={(event) =>
                          setReportForm((current) => ({
                            ...current,
                            sitePhotoUrl: event.target.value,
                          }))
                        }
                        disabled={submittingReport}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="report-notes">Notes</Label>
                    <Textarea
                      id="report-notes"
                      placeholder="Work completed, blockers, site notes..."
                      value={reportForm.notes}
                      onChange={(event) =>
                        setReportForm((current) => ({ ...current, notes: event.target.value }))
                      }
                      disabled={submittingReport}
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={submitReport} disabled={submittingReport}>
                      <Send className="mr-1.5 h-4 w-4" />
                      {submittingReport ? "Submitting..." : "Submit report"}
                    </Button>
                  </DialogFooter>
                </div>
              )}

              <div className="overflow-hidden rounded-lg border">
                {reportsLoading ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Loading report history...
                  </div>
                ) : reportsError ? (
                  <QueryError
                    message={
                      reportsErrorValue instanceof Error ? reportsErrorValue.message : undefined
                    }
                    onRetry={() => refetchReports()}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reporter</TableHead>
                        <TableHead className="text-right">Increment</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                            No progress reports yet.
                          </TableCell>
                        </TableRow>
                      )}
                      {reports.map((report) => (
                        <TableRow key={report.reportId}>
                          <TableCell className="text-xs">{formatDate(report.reportDate)}</TableCell>
                          <TableCell>
                            {report.engineerName || `User #${report.engineerId}`}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            +{report.progressIncrement}%
                          </TableCell>
                          <TableCell className="max-w-sm text-sm text-muted-foreground">
                            {report.notes || "-"}
                            {report.sitePhotoUrl && (
                              <a
                                href={report.sitePhotoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-2 text-primary underline-offset-4 hover:underline"
                              >
                                Photo
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
