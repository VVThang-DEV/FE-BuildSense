import { useMemo, useState, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart3,
  CalendarRange,
  CheckCircle2,
  ExternalLink,
  Eye,
  ImageIcon,
  Plus,
  PackagePlus,
  Send,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requireApiResult } from "@/api/client";
import { progressReportsApi, type ProgressReportResponse } from "@/api/progressReports";
import { type TaskResponse, tasksApi } from "@/api/tasks";
import { materialsApi } from "@/api/materials";
import { materialRequestsApi } from "@/api/materialRequests";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { isCloudinaryConfigured, uploadSitePhoto } from "@/lib/cloudinary";
import { QueryError } from "./query-error";
import { ConfirmDialog } from "./confirm-dialog";

type ProjectTaskBoardProps = {
  projectId: number;
  projectName?: string;
};

type TaskForm = {
  phaseName: string;
  taskName: string;
  plannedBudget: string;
  baselineStart: string;
  baselineEnd: string;
};

type TaskMaterialForm = {
  variantId: string;
  quantity: string;
};

type ReportForm = {
  progressIncrement: string;
  actualCostIncrement: string;
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
    plannedBudget: "0",
    baselineStart: todayInput(),
    baselineEnd: plusDaysInput(7),
  };
}

const initialReportForm: ReportForm = {
  progressIncrement: "5",
  actualCostIncrement: "0",
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
  if (status === "ACTIVE" || status === "IN_PROGRESS")
    return "border-primary/30 bg-primary/10 text-primary";
  if (status === "REJECTED" || status === "CANCELLED")
    return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-warning/35 bg-warning/10 text-warning-foreground";
}

function validHttpsUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function ProjectTaskBoard({ projectId, projectName }: ProjectTaskBoardProps) {
  const queryClient = useQueryClient();
  const session = useSession();
  const canManageTasks = session?.role === "PM";
  const [taskForm, setTaskForm] = useState<TaskForm>(() => newTaskForm());
  const [taskMaterials, setTaskMaterials] = useState<TaskMaterialForm[]>([]);
  const [reportForm, setReportForm] = useState<ReportForm>(initialReportForm);
  const [creatingTask, setCreatingTask] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reviewingReport, setReviewingReport] = useState<number | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [materialAction, setMaterialAction] = useState<string | null>(null);
  const [assignVariantId, setAssignVariantId] = useState("");
  const [assignMaterialQuantity, setAssignMaterialQuantity] = useState("1");
  const [reportPhoto, setReportPhoto] = useState<{
    url: string;
    date: string;
    reporter: string;
    notes: string;
  } | null>(null);
  const [reviewDialog, setReviewDialog] = useState<{
    report: ProgressReportResponse;
    action: "approve" | "reject" | "reverse";
    reviewNote: string;
    allowCostOverrun: boolean;
  } | null>(null);
  const [taskStatusDialog, setTaskStatusDialog] = useState<{
    task: TaskResponse;
    action: "cancel" | "reject" | "reopen";
  } | null>(null);
  const [editTaskDialog, setEditTaskDialog] = useState<{
    taskId: number;
    rowVersion: string;
    phaseName: string;
    taskName: string;
    plannedBudget: string;
    baselineStart: string;
    baselineEnd: string;
  } | null>(null);
  const [correctionDialog, setCorrectionDialog] = useState<{
    report: ProgressReportResponse;
    progressIncrement: string;
    actualCostIncrement: string;
  } | null>(null);

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

  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: async () =>
      requireApiResult(await materialsApi.getAll(), "Could not load materials") ?? [],
    enabled: !!session?.token,
    staleTime: 30_000,
  });

  const variants = useMemo(
    () =>
      materials.flatMap((material) =>
        material.variants
          .filter((variant) => variant.isActive)
          .map((variant) => ({
            ...variant,
            label: `${material.materialName} - ${variant.variantName}`,
          })),
      ),
    [materials],
  );

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
  const canReportSelected = !!selectedTask && selectedRemaining > 0 && canManageTasks;

  const reportIncrement = Number(reportForm.progressIncrement);
  const actualCostIncrement = Number(reportForm.actualCostIncrement);
  const reportFormValid =
    Number.isFinite(reportIncrement) &&
    reportIncrement > 0 &&
    reportIncrement <= selectedRemaining &&
    Number.isFinite(actualCostIncrement) &&
    actualCostIncrement >= 0 &&
    reportForm.notes.length <= 1000 &&
    validHttpsUrl(reportForm.sitePhotoUrl);

  const handlePhotoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!isCloudinaryConfigured) {
      toast.error("Configure the Cloudinary cloud name and upload preset first");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("The image must be 10 MB or smaller");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPhotoPreviewUrl(localPreview);
    setUploadingPhoto(true);
    try {
      const uploaded = await uploadSitePhoto(file);
      setReportForm((current) => ({ ...current, sitePhotoUrl: uploaded.secureUrl }));
      setPhotoPreviewUrl(uploaded.secureUrl);
      toast.success("Site photo uploaded");
    } catch (error) {
      setPhotoPreviewUrl("");
      toast.error(error instanceof Error ? error.message : "Could not upload the photo");
    } finally {
      URL.revokeObjectURL(localPreview);
      setUploadingPhoto(false);
    }
  };

  const clearPhoto = () => {
    setReportForm((current) => ({ ...current, sitePhotoUrl: "" }));
    setPhotoPreviewUrl("");
  };

  const submitTask = async () => {
    if (!taskForm.phaseName.trim() || !taskForm.taskName.trim()) {
      toast.error("Phase and task name are required");
      return;
    }
    const plannedBudget = Number(taskForm.plannedBudget);
    if (!Number.isFinite(plannedBudget) || plannedBudget < 0) {
      toast.error("Planned budget must be 0 or greater");
      return;
    }
    if (!session?.userId) {
      toast.error("Could not resolve the signed-in Project Manager");
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
    const materialRows = taskMaterials.map((item) => ({
      variantId: Number(item.variantId),
      grossQuantityRequired: Number(item.quantity),
    }));
    if (
      materialRows.some(
        (item) =>
          !Number.isInteger(item.variantId) ||
          item.variantId <= 0 ||
          !Number.isFinite(item.grossQuantityRequired) ||
          item.grossQuantityRequired <= 0,
      )
    ) {
      toast.error("Every material requirement needs a variant and quantity greater than 0");
      return;
    }
    if (new Set(materialRows.map((item) => item.variantId)).size !== materialRows.length) {
      toast.error("A material variant can only appear once on a task");
      return;
    }

    setCreatingTask(true);
    try {
      const response = await tasksApi.create({
        projectId,
        phaseName: taskForm.phaseName.trim(),
        taskName: taskForm.taskName.trim(),
        assignedToUserID: session.userId,
        plannedBudget,
        baselineStart: `${taskForm.baselineStart}T00:00:00.000Z`,
        baselineEnd: `${taskForm.baselineEnd}T00:00:00.000Z`,
        materials: materialRows,
      });

      if (response.isSuccess) {
        toast.success(responseMessage(response.result, "Task created"));
        setCreateTaskOpen(false);
        setTaskForm(newTaskForm());
        setTaskMaterials([]);
        await refetchTasks();
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["project-material-requirements", projectId],
          }),
          queryClient.invalidateQueries({ queryKey: ["project-mrp", projectId] }),
        ]);
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

  const assignMaterial = async () => {
    if (!selectedTask || !assignVariantId || Number(assignMaterialQuantity) <= 0) {
      toast.error("Select a material variant and enter a quantity greater than 0");
      return;
    }
    setMaterialAction(`assign-${selectedTask.taskId}`);
    try {
      const response = await tasksApi.assignMaterial(selectedTask.taskId, {
        variantId: Number(assignVariantId),
        grossQuantityRequired: Number(assignMaterialQuantity),
      });
      if (!response.isSuccess) {
        toast.error(
          response.errorMessage ??
            responseMessage(response.result, "Could not save material requirement"),
        );
        return;
      }
      toast.success("Task material requirement saved");
      setAssignVariantId("");
      setAssignMaterialQuantity("1");
      await refetchTasks();
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["project-material-requirements", projectId],
        }),
        queryClient.invalidateQueries({ queryKey: ["project-mrp", projectId] }),
      ]);
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setMaterialAction(null);
    }
  };

  const createMaterialRequestFromTask = async () => {
    if (!selectedTask) return;
    setMaterialAction(`request-${selectedTask.taskId}`);
    try {
      const response = await materialRequestsApi.createFromTask(selectedTask.taskId);
      if (!response.isSuccess) {
        toast.error(
          response.errorMessage ??
            responseMessage(response.result, "Could not create material request"),
        );
        return;
      }
      toast.success(`Material request created from ${selectedTask.taskName}`);
      await queryClient.invalidateQueries({ queryKey: ["material-requests"] });
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setMaterialAction(null);
    }
  };

  const submitReport = async () => {
    if (!selectedTask) return;
    const progressIncrement = Number(reportForm.progressIncrement);
    const actualCostIncrement = Number(reportForm.actualCostIncrement);
    if (!Number.isFinite(progressIncrement) || progressIncrement <= 0) {
      toast.error("Progress increment must be greater than 0");
      return;
    }
    if (progressIncrement > selectedRemaining) {
      toast.error(`Only ${selectedRemaining}% progress remains for this task`);
      return;
    }
    if (!Number.isFinite(actualCostIncrement) || actualCostIncrement < 0) {
      toast.error("Actual cost increment must be 0 or greater");
      return;
    }
    if (reportForm.notes.length > 1000) {
      toast.error("Notes must be 1,000 characters or fewer");
      return;
    }
    if (!validHttpsUrl(reportForm.sitePhotoUrl)) {
      toast.error("The site photo must use a valid HTTPS URL");
      return;
    }

    setSubmittingReport(true);
    try {
      const response = await progressReportsApi.create({
        taskId: selectedTask.taskId,
        progressIncrement,
        actualCostIncrement,
        notes: reportForm.notes.trim() || undefined,
        sitePhotoUrl: reportForm.sitePhotoUrl.trim() || undefined,
      });

      if (response.isSuccess) {
        toast.success("Progress report submitted for Project Manager approval");
        setReportForm(initialReportForm);
        setPhotoPreviewUrl("");
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

  const openReportReview = (
    report: ProgressReportResponse,
    action: "approve" | "reject" | "reverse",
  ) => {
    setReviewDialog({ report, action, reviewNote: "", allowCostOverrun: false });
  };

  const reviewReport = async () => {
    if (!reviewDialog) return;
    const { report, action, reviewNote, allowCostOverrun } = reviewDialog;
    const wouldOverrun =
      action === "approve" &&
      !!selectedTask &&
      selectedTask.actualCost + report.actualCostIncrement > selectedTask.plannedBudget;
    if (wouldOverrun && !allowCostOverrun) return;
    setReviewingReport(report.reportId);
    try {
      const response =
        action === "approve"
          ? await progressReportsApi.approve(report.reportId, {
              rowVersion: report.rowVersion,
              reviewNote: reviewNote.trim() || undefined,
              allowCostOverrun,
            })
          : action === "reject"
            ? await progressReportsApi.reject(report.reportId, {
                rowVersion: report.rowVersion,
                reviewNote: reviewNote.trim() || undefined,
              })
            : await progressReportsApi.reverse(report.reportId, {
                rowVersion: report.rowVersion,
                reviewNote: reviewNote.trim() || undefined,
              });
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? `Could not ${action} report`);
        if (response.statusCode === 409) await refetchReports();
        return;
      }
      toast.success(`Progress report ${action}d`);
      setReviewDialog(null);
      await Promise.all([refetchReports(), refetchTasks()]);
    } finally {
      setReviewingReport(null);
    }
  };

  const changeTaskStatus = async () => {
    if (!taskStatusDialog) return;
    const { task, action } = taskStatusDialog;
    const response = await tasksApi.changeStatus(task.taskId, action, task.rowVersion);
    if (!response.isSuccess) {
      toast.error(response.errorMessage ?? `Could not ${action} task`);
      return;
    }
    toast.success(`Task ${action}d`);
    setTaskStatusDialog(null);
    await refetchTasks();
  };

  const editTask = (task: TaskResponse) => {
    setEditTaskDialog({
      taskId: task.taskId,
      rowVersion: task.rowVersion,
      phaseName: task.phaseName,
      taskName: task.taskName,
      plannedBudget: String(task.plannedBudget),
      baselineStart: task.baselineStart.slice(0, 10),
      baselineEnd: task.baselineEnd.slice(0, 10),
    });
  };

  const submitTaskEdit = async () => {
    if (!editTaskDialog) return;
    if (!session?.userId) {
      toast.error("Could not resolve the signed-in Project Manager");
      return;
    }
    const plannedBudget = Number(editTaskDialog.plannedBudget);
    if (
      !editTaskDialog.phaseName.trim() ||
      !editTaskDialog.taskName.trim() ||
      !Number.isFinite(plannedBudget) ||
      plannedBudget < 0 ||
      !editTaskDialog.baselineStart ||
      !editTaskDialog.baselineEnd
    ) {
      toast.error("Enter a valid task name, phase, budget, and schedule");
      return;
    }
    if (new Date(editTaskDialog.baselineEnd) < new Date(editTaskDialog.baselineStart)) {
      toast.error("Baseline end cannot be before baseline start");
      return;
    }
    const response = await tasksApi.update(editTaskDialog.taskId, {
      phaseName: editTaskDialog.phaseName.trim(),
      taskName: editTaskDialog.taskName.trim(),
      assignedToUserID: session.userId,
      plannedBudget,
      baselineStart: editTaskDialog.baselineStart,
      baselineEnd: editTaskDialog.baselineEnd,
      rowVersion: editTaskDialog.rowVersion,
    });
    if (!response.isSuccess) toast.error(response.errorMessage ?? "Could not update task");
    else {
      toast.success("Task updated");
      setEditTaskDialog(null);
      await refetchTasks();
    }
  };

  const openCorrection = (report: ProgressReportResponse) => {
    setCorrectionDialog({
      report,
      progressIncrement: String(report.progressIncrement),
      actualCostIncrement: String(report.actualCostIncrement),
    });
  };

  const correctReport = async () => {
    if (!correctionDialog) return;
    const progressIncrement = Number(correctionDialog.progressIncrement);
    const actualCostIncrement = Number(correctionDialog.actualCostIncrement);
    if (
      !Number.isFinite(progressIncrement) ||
      progressIncrement <= 0 ||
      !Number.isFinite(actualCostIncrement) ||
      actualCostIncrement < 0
    ) {
      toast.error("Corrected progress must be positive and cost cannot be negative");
      return;
    }
    const { report } = correctionDialog;
    const response = await progressReportsApi.correct(report.reportId, {
      progressIncrement,
      actualCostIncrement,
      notes: report.notes ?? undefined,
      sitePhotoUrl: report.sitePhotoUrl ?? undefined,
      rowVersion: report.rowVersion,
    });
    if (!response.isSuccess) toast.error(response.errorMessage ?? "Could not create correction");
    else {
      toast.success("Correction submitted for approval");
      setCorrectionDialog(null);
      await refetchReports();
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[180px_180px_minmax(0,1fr)]">
        <TaskMetric label="Tasks" value={String(tasks.length)} />
        <TaskMetric label="Completed" value={String(completedCount)} />
        <ProjectProgressSummary
          tasks={tasks}
          progress={averageProgress}
          completedCount={completedCount}
        />
      </div>

      {canManageTasks && (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setCreateTaskOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New task
            </Button>
          </div>
          <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create project task</DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Add the schedule, budget, and optional planned materials.
                </p>
              </DialogHeader>
              <div className="space-y-4">
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
                      maxLength={100}
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
                      maxLength={200}
                      disabled={creatingTask}
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <Label htmlFor="task-budget">Planned budget</Label>
                    <Input
                      id="task-budget"
                      type="number"
                      min="0"
                      step="0.01"
                      value={taskForm.plannedBudget}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          plannedBudget: event.target.value,
                        }))
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
                        setTaskForm((current) => ({
                          ...current,
                          baselineStart: event.target.value,
                        }))
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
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Material requirements</p>
                      <p className="text-xs text-muted-foreground">
                        Optional planned quantities for this task.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setTaskMaterials((rows) => [...rows, { variantId: "", quantity: "1" }])
                      }
                      disabled={creatingTask}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add material
                    </Button>
                  </div>
                  {taskMaterials.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No planned materials added.</p>
                  ) : (
                    <div className="space-y-2">
                      {taskMaterials.map((row, index) => {
                        const variant = variants.find(
                          (item) => item.variantId === Number(row.variantId),
                        );
                        return (
                          <div
                            key={index}
                            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_36px]"
                          >
                            <Select
                              value={row.variantId}
                              onValueChange={(value) =>
                                setTaskMaterials((rows) =>
                                  rows.map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, variantId: value } : item,
                                  ),
                                )
                              }
                              disabled={creatingTask}
                            >
                              <SelectTrigger aria-label={`Material ${index + 1}`}>
                                <SelectValue placeholder="Select material variant" />
                              </SelectTrigger>
                              <SelectContent>
                                {variants.map((item) => (
                                  <SelectItem key={item.variantId} value={String(item.variantId)}>
                                    {item.label} ({item.unit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={row.quantity}
                                onChange={(event) =>
                                  setTaskMaterials((rows) =>
                                    rows.map((item, itemIndex) =>
                                      itemIndex === index
                                        ? { ...item, quantity: event.target.value }
                                        : item,
                                    ),
                                  )
                                }
                                disabled={creatingTask}
                                aria-label={`Quantity for material ${index + 1}`}
                              />
                              {variant?.unit && (
                                <span className="pointer-events-none absolute right-3 top-2 text-xs text-muted-foreground">
                                  {variant.unit}
                                </span>
                              )}
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setTaskMaterials((rows) =>
                                  rows.filter((_, itemIndex) => itemIndex !== index),
                                )
                              }
                              disabled={creatingTask}
                              aria-label="Remove material"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateTaskOpen(false)}
                  disabled={creatingTask}
                >
                  Cancel
                </Button>
                <Button onClick={submitTask} disabled={creatingTask}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  {creatingTask ? "Creating..." : "Create task"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {!tasksLoading && !tasksError && tasks.length > 0 && (
        <ScheduleTimeline tasks={tasks} onSelectTask={setSelectedTaskId} />
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
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
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
                      {canManageTasks &&
                        task.status !== "COMPLETED" &&
                        task.status !== "CANCELLED" && (
                          <Button size="sm" variant="ghost" onClick={() => editTask(task)}>
                            Edit
                          </Button>
                        )}
                      {canManageTasks && task.status === "PENDING" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setTaskStatusDialog({ task, action: "reject" })}
                        >
                          Reject
                        </Button>
                      )}
                      {canManageTasks &&
                        task.status !== "COMPLETED" &&
                        task.status !== "CANCELLED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setTaskStatusDialog({ task, action: "cancel" })}
                          >
                            Cancel
                          </Button>
                        )}
                      {canManageTasks &&
                        (task.status === "REJECTED" || task.status === "CANCELLED") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setTaskStatusDialog({ task, action: "reopen" })}
                          >
                            Reopen
                          </Button>
                        )}
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
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.taskName ?? "Task progress"}</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
                <InfoBlock label="Phase" value={selectedTask.phaseName} />
                <InfoBlock label="Remaining" value={`${selectedRemaining}%`} />
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Planned materials</p>
                    <p className="text-xs text-muted-foreground">
                      Gross requirements currently assigned to this task.
                    </p>
                  </div>
                  {canManageTasks && (selectedTask.materialRequirements ?? []).length > 0 && (
                    <Button
                      size="sm"
                      onClick={createMaterialRequestFromTask}
                      disabled={materialAction !== null}
                    >
                      <PackagePlus className="mr-1.5 h-4 w-4" />
                      {materialAction === `request-${selectedTask.taskId}`
                        ? "Creating request..."
                        : "Create material request"}
                    </Button>
                  )}
                </div>
                {(selectedTask.materialRequirements ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No material requirements assigned yet.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(selectedTask.materialRequirements ?? []).map((item) => (
                      <div
                        key={item.variantId}
                        className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
                      >
                        <span>
                          {item.materialName} - {item.variantName}
                        </span>
                        <span className="font-medium tabular-nums">
                          {item.grossQuantityRequired.toLocaleString()} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {canManageTasks && (
                  <div className="grid gap-2 border-t pt-3 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
                    <Select value={assignVariantId} onValueChange={setAssignVariantId}>
                      <SelectTrigger aria-label="Material to assign">
                        <SelectValue placeholder="Add or update variant" />
                      </SelectTrigger>
                      <SelectContent>
                        {variants.map((item) => (
                          <SelectItem key={item.variantId} value={String(item.variantId)}>
                            {item.label} ({item.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={assignMaterialQuantity}
                      onChange={(event) => setAssignMaterialQuantity(event.target.value)}
                      aria-label="Gross material quantity"
                    />
                    <Button
                      variant="outline"
                      onClick={assignMaterial}
                      disabled={materialAction !== null || !assignVariantId}
                    >
                      Save requirement
                    </Button>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Creating a request reserves the full gross quantity. The backend prevents a second
                  active or issued request for the same task.
                </p>
              </div>

              {canReportSelected && (
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">Submit progress report</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <Label htmlFor="progress-increment">Progress completed today (%)</Label>
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
                      <p className="mt-1 text-xs text-muted-foreground">
                        Current: {100 - selectedRemaining}% · Remaining: {selectedRemaining}%
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="actual-cost-increment">Actual cost added</Label>
                      <Input
                        id="actual-cost-increment"
                        type="number"
                        min="0"
                        step="0.01"
                        value={reportForm.actualCostIncrement}
                        onChange={(event) =>
                          setReportForm((current) => ({
                            ...current,
                            actualCostIncrement: event.target.value,
                          }))
                        }
                        disabled={submittingReport}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Added to the task&apos;s cumulative actual cost.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="site-photo">Site photo</Label>
                      <div className="flex gap-2">
                        <Input
                          id="site-photo"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handlePhotoSelected}
                          disabled={submittingReport || uploadingPhoto || !isCloudinaryConfigured}
                          className="file:mr-2 file:text-sm"
                        />
                        {reportForm.sitePhotoUrl && (
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={clearPhoto}
                            disabled={submittingReport || uploadingPhoto}
                            aria-label="Remove uploaded photo"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {uploadingPhoto
                          ? "Uploading to Cloudinary..."
                          : isCloudinaryConfigured
                            ? "JPEG, PNG, WebP or GIF up to 10 MB."
                            : "Add Cloudinary settings to .env to enable uploads."}
                      </p>
                    </div>
                  </div>
                  {(photoPreviewUrl || reportForm.sitePhotoUrl) && (
                    <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
                      <img
                        src={photoPreviewUrl || reportForm.sitePhotoUrl}
                        alt="Site photo preview"
                        className="h-24 w-32 rounded-md border object-cover"
                      />
                      <div className="min-w-0 text-sm">
                        <p className="flex items-center gap-1.5 font-medium">
                          <UploadCloud className="h-4 w-4 text-success" />
                          Photo ready
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          The Cloudinary URL will be saved with this report.
                        </p>
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="report-notes">Notes</Label>
                      <span className="text-xs text-muted-foreground">
                        {reportForm.notes.length}/1,000
                      </span>
                    </div>
                    <Textarea
                      id="report-notes"
                      placeholder="Work completed, blockers, site notes..."
                      value={reportForm.notes}
                      onChange={(event) =>
                        setReportForm((current) => ({ ...current, notes: event.target.value }))
                      }
                      maxLength={1000}
                      disabled={submittingReport}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={submitReport}
                      disabled={submittingReport || uploadingPhoto || !reportFormValid}
                    >
                      <Send className="mr-1.5 h-4 w-4" />
                      {submittingReport ? "Submitting..." : "Submit report"}
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {selectedRemaining === 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 p-4 text-success">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-medium">Task completed</p>
                    <p className="mt-0.5 text-xs opacity-80">
                      This task has reached 100%. Its progress history remains available below.
                    </p>
                  </div>
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
                        <TableHead className="text-right">Increment</TableHead>
                        <TableHead className="text-right">Cost added</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes / photo</TableHead>
                        <TableHead className="text-right">Review</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                            No progress reports yet.
                          </TableCell>
                        </TableRow>
                      )}
                      {reports.map((report) => (
                        <TableRow key={report.reportId} className="[&>td]:align-top [&>td]:py-4">
                          <TableCell className="whitespace-nowrap text-xs">
                            {formatDate(report.reportDate)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right tabular-nums">
                            +{report.progressIncrement}%
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right tabular-nums">
                            {formatMoney(report.actualCostIncrement)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{report.status}</Badge>
                          </TableCell>
                          <TableCell className="max-w-sm text-sm text-muted-foreground">
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_80px]">
                              <p className="min-w-0 flex-1">{report.notes || "-"}</p>
                              {report.sitePhotoUrl && (
                                <button
                                  type="button"
                                  className="group shrink-0 text-left text-primary"
                                  onClick={() =>
                                    setReportPhoto({
                                      url: report.sitePhotoUrl!,
                                      date: report.reportDate,
                                      reporter:
                                        report.reportedByName || `User #${report.reportedByUserId}`,
                                      notes: report.notes || "No notes provided.",
                                    })
                                  }
                                  aria-label={`Preview site photo from ${formatDate(report.reportDate)}`}
                                >
                                  <img
                                    src={report.sitePhotoUrl}
                                    alt="Progress report site"
                                    className="h-15 w-20 rounded-md border object-cover shadow-sm transition group-hover:opacity-85"
                                    loading="lazy"
                                  />
                                  <span className="mt-1 flex items-center gap-1 text-[11px] underline-offset-4 group-hover:underline">
                                    <ImageIcon className="h-3 w-3" /> Preview
                                  </span>
                                </button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {canManageTasks && report.status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={reviewingReport === report.reportId}
                                  onClick={() => openReportReview(report, "approve")}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  disabled={reviewingReport === report.reportId}
                                  onClick={() => openReportReview(report, "reject")}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {canManageTasks && report.status === "APPROVED" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={reviewingReport === report.reportId}
                                  onClick={() => openCorrection(report)}
                                >
                                  Correct
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  disabled={reviewingReport === report.reportId}
                                  onClick={() => openReportReview(report, "reverse")}
                                >
                                  Reverse
                                </Button>
                              </>
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

      <Dialog
        open={editTaskDialog !== null}
        onOpenChange={(open) => !open && setEditTaskDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>
          {editTaskDialog && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="edit-task-phase">Phase</Label>
                  <Input
                    id="edit-task-phase"
                    value={editTaskDialog.phaseName}
                    onChange={(event) =>
                      setEditTaskDialog((current) =>
                        current ? { ...current, phaseName: event.target.value } : current,
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-task-name">Task name</Label>
                  <Input
                    id="edit-task-name"
                    value={editTaskDialog.taskName}
                    onChange={(event) =>
                      setEditTaskDialog((current) =>
                        current ? { ...current, taskName: event.target.value } : current,
                      )
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-task-budget">Planned budget</Label>
                <Input
                  id="edit-task-budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editTaskDialog.plannedBudget}
                  onChange={(event) =>
                    setEditTaskDialog((current) =>
                      current ? { ...current, plannedBudget: event.target.value } : current,
                    )
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="edit-task-start">Baseline start</Label>
                  <Input
                    id="edit-task-start"
                    type="date"
                    value={editTaskDialog.baselineStart}
                    onChange={(event) =>
                      setEditTaskDialog((current) =>
                        current ? { ...current, baselineStart: event.target.value } : current,
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-task-end">Baseline end</Label>
                  <Input
                    id="edit-task-end"
                    type="date"
                    min={editTaskDialog.baselineStart}
                    value={editTaskDialog.baselineEnd}
                    onChange={(event) =>
                      setEditTaskDialog((current) =>
                        current ? { ...current, baselineEnd: event.target.value } : current,
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTaskDialog(null)}>
              Cancel
            </Button>
            <Button onClick={submitTaskEdit}>Save task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewDialog !== null} onOpenChange={(open) => !open && setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{reviewDialog?.action} progress report</DialogTitle>
          </DialogHeader>
          {reviewDialog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 text-sm">
                <InfoBlock label="Progress" value={`+${reviewDialog.report.progressIncrement}%`} />
                <InfoBlock
                  label="Cost"
                  value={formatMoney(reviewDialog.report.actualCostIncrement)}
                />
              </div>
              <div>
                <Label htmlFor="report-review-note">Review note</Label>
                <Textarea
                  id="report-review-note"
                  value={reviewDialog.reviewNote}
                  onChange={(event) =>
                    setReviewDialog((current) =>
                      current ? { ...current, reviewNote: event.target.value } : current,
                    )
                  }
                  maxLength={1000}
                  placeholder="Optional review context"
                />
              </div>
              {reviewDialog.action === "approve" &&
                selectedTask &&
                selectedTask.actualCost + reviewDialog.report.actualCostIncrement >
                  selectedTask.plannedBudget && (
                  <label className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={reviewDialog.allowCostOverrun}
                      onChange={(event) =>
                        setReviewDialog((current) =>
                          current
                            ? { ...current, allowCostOverrun: event.target.checked }
                            : current,
                        )
                      }
                    />
                    <span>Approve this report even though it exceeds the planned task budget.</span>
                  </label>
                )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialog(null)}
              disabled={reviewingReport !== null}
            >
              Cancel
            </Button>
            <Button
              variant={
                reviewDialog?.action === "reject" || reviewDialog?.action === "reverse"
                  ? "destructive"
                  : "default"
              }
              onClick={reviewReport}
              disabled={
                reviewingReport !== null ||
                (!!reviewDialog &&
                  reviewDialog.action === "approve" &&
                  !!selectedTask &&
                  selectedTask.actualCost + reviewDialog.report.actualCostIncrement >
                    selectedTask.plannedBudget &&
                  !reviewDialog.allowCostOverrun)
              }
            >
              {reviewingReport !== null ? "Saving..." : "Confirm review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={correctionDialog !== null}
        onOpenChange={(open) => !open && setCorrectionDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correct progress report</DialogTitle>
          </DialogHeader>
          {correctionDialog && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="correct-progress">Progress increment (%)</Label>
                <Input
                  id="correct-progress"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={correctionDialog.progressIncrement}
                  onChange={(event) =>
                    setCorrectionDialog((current) =>
                      current ? { ...current, progressIncrement: event.target.value } : current,
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="correct-cost">Actual cost increment</Label>
                <Input
                  id="correct-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={correctionDialog.actualCostIncrement}
                  onChange={(event) =>
                    setCorrectionDialog((current) =>
                      current ? { ...current, actualCostIncrement: event.target.value } : current,
                    )
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectionDialog(null)}>
              Cancel
            </Button>
            <Button onClick={correctReport}>Submit correction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={taskStatusDialog !== null}
        onOpenChange={(open) => !open && setTaskStatusDialog(null)}
        title={`${taskStatusDialog?.action === "reopen" ? "Reopen" : taskStatusDialog?.action === "reject" ? "Reject" : "Cancel"} this task?`}
        description={
          taskStatusDialog
            ? `${taskStatusDialog.task.taskName} will move to ${
                taskStatusDialog.action === "reopen"
                  ? "an active workflow"
                  : taskStatusDialog.action === "reject"
                    ? "rejected status"
                    : "cancelled status"
              }.`
            : ""
        }
        confirmLabel={
          taskStatusDialog?.action === "reopen"
            ? "Reopen task"
            : `${taskStatusDialog?.action ?? "Update"} task`
        }
        destructive={taskStatusDialog?.action !== "reopen"}
        onConfirm={changeTaskStatus}
      />

      <Dialog open={reportPhoto !== null} onOpenChange={(open) => !open && setReportPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Site photo</DialogTitle>
          </DialogHeader>
          {reportPhoto && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium">{reportPhoto.reporter}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(reportPhoto.date)} · {reportPhoto.notes}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <a href={reportPhoto.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open original
                  </a>
                </Button>
              </div>
              <div className="flex max-h-[70vh] items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
                <img
                  src={reportPhoto.url}
                  alt={`Site progress reported by ${reportPhoto.reporter}`}
                  className="max-h-[70vh] w-auto max-w-full object-contain"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScheduleTimeline({
  tasks,
  onSelectTask,
}: {
  tasks: TaskResponse[];
  onSelectTask: (taskId: number) => void;
}) {
  const scheduled = useMemo(
    () =>
      tasks
        .map((task) => ({
          task,
          start: new Date(task.baselineStart).getTime(),
          end: new Date(task.baselineEnd).getTime(),
        }))
        .filter((item) => Number.isFinite(item.start) && Number.isFinite(item.end))
        .sort((left, right) => left.start - right.start),
    [tasks],
  );

  if (scheduled.length === 0) return null;

  const rangeStart = Math.min(...scheduled.map((item) => item.start));
  const rangeEnd = Math.max(...scheduled.map((item) => item.end));
  const day = 86_400_000;
  const range = Math.max(day, rangeEnd - rangeStart + day);
  const todayPosition = ((Date.now() - rangeStart) / range) * 100;
  const phases = Array.from(new Set(scheduled.map(({ task }) => task.phaseName)));
  const axisTicks = [0, 25, 50, 75, 100].map((position) => ({
    position,
    date: new Date(rangeStart + ((rangeEnd - rangeStart) * position) / 100),
  }));

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarRange className="h-4 w-4 text-primary" />
          WBS schedule
          <Badge variant="outline" className="ml-auto font-normal">
            Read only
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Baseline from {formatDate(new Date(rangeStart).toISOString())} to{" "}
          {formatDate(new Date(rangeEnd).toISOString())}. Tasks are grouped by phase.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-5 rounded-sm border bg-muted/50" /> Planned duration
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-5 rounded-sm bg-primary" /> Actual progress
          </span>
          {todayPosition >= 0 && todayPosition <= 100 && (
            <span className="flex items-center gap-1.5">
              <span className="h-3 border-l-2 border-destructive/70" /> Today ·{" "}
              {formatDate(new Date().toISOString())}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="mb-2 grid grid-cols-[300px_minmax(0,1fr)] gap-3 text-xs text-muted-foreground">
            <span>Phase / task</span>
            <div className="relative h-5">
              {axisTicks.map((tick) => (
                <span
                  key={tick.position}
                  className={cn(
                    "absolute top-0 whitespace-nowrap",
                    tick.position === 0
                      ? "left-0"
                      : tick.position === 100
                        ? "right-0"
                        : "-translate-x-1/2",
                  )}
                  style={
                    tick.position === 0 || tick.position === 100
                      ? undefined
                      : { left: `${tick.position}%` }
                  }
                >
                  {formatDate(tick.date.toISOString())}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {phases.map((phase) => (
              <div key={phase} className="space-y-1.5">
                <p className="border-b pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {phase}
                </p>
                {scheduled
                  .filter(({ task }) => task.phaseName === phase)
                  .map(({ task, start, end }) => {
                    const left = Math.max(0, ((start - rangeStart) / range) * 100);
                    const width = Math.max(2, ((Math.max(end, start) - start + day) / range) * 100);
                    const overdue = end < Date.now() && task.status !== "COMPLETED";
                    return (
                      <button
                        type="button"
                        key={task.taskId}
                        className="grid w-full grid-cols-[300px_minmax(0,1fr)] items-center gap-3 rounded-md py-1 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => onSelectTask(task.taskId)}
                        aria-label={`Open progress details for ${task.taskName}`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium" title={task.taskName}>
                            {task.taskName}
                          </p>
                          <p
                            className={cn(
                              "text-xs text-muted-foreground",
                              overdue && "text-destructive",
                            )}
                          >
                            {overdue && "Overdue · "}
                            {Number(task.actualProgressPct || 0)}% complete
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Baseline {formatDate(task.baselineStart)} –{" "}
                            {formatDate(task.baselineEnd)}
                          </p>
                        </div>
                        <div className="relative h-8 overflow-hidden rounded border bg-muted/40">
                          {[25, 50, 75].map((position) => (
                            <span
                              key={position}
                              className="absolute inset-y-0 border-l border-dashed border-border/70"
                              style={{ left: `${position}%` }}
                            />
                          ))}
                          {todayPosition >= 0 && todayPosition <= 100 && (
                            <div
                              className="absolute inset-y-0 z-20 border-l-2 border-destructive/70"
                              style={{ left: `${todayPosition}%` }}
                              title={`Today: ${formatDate(new Date().toISOString())}`}
                            />
                          )}
                          <div
                            className="absolute top-1.5 h-5 rounded border bg-muted/60"
                            style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
                            title={`${task.taskName}: ${formatDate(task.baselineStart)} - ${formatDate(task.baselineEnd)}, ${Number(task.actualProgressPct || 0)}% complete`}
                          >
                            <span
                              className={cn(
                                "absolute inset-y-0 left-0 rounded-sm",
                                overdue
                                  ? "bg-destructive"
                                  : task.status === "COMPLETED"
                                    ? "bg-success"
                                    : "bg-primary",
                              )}
                              style={{
                                width: `${Math.min(100, Math.max(0, Number(task.actualProgressPct || 0)))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
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

function ProjectProgressSummary({
  tasks,
  progress,
  completedCount,
}: {
  tasks: TaskResponse[];
  progress: number;
  completedCount: number;
}) {
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const phaseProgress = Array.from(new Set(tasks.map((task) => task.phaseName))).map((phase) => {
    const phaseTasks = tasks.filter((task) => task.phaseName === phase);
    const value = phaseTasks.length
      ? Math.round(
          phaseTasks.reduce((total, task) => total + Number(task.actualProgressPct || 0), 0) /
            phaseTasks.length,
        )
      : 0;
    return { phase, value, taskCount: phaseTasks.length };
  });

  return (
    <Card className="shadow-sm md:col-span-2 xl:col-span-1">
      <CardContent className="grid gap-5 p-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
        <div className="flex flex-col items-center">
          <div
            role="progressbar"
            aria-label="Overall project completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={normalizedProgress}
            className="relative h-32 w-32 rounded-full"
            style={{
              background: `conic-gradient(var(--primary) ${normalizedProgress}%, var(--muted) ${normalizedProgress}% 100%)`,
            }}
          >
            <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-card">
              <span className="text-2xl font-bold tabular-nums">{normalizedProgress}%</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                complete
              </span>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {completedCount}/{tasks.length} tasks completed
          </p>
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Project progress</p>
              <p className="text-xs text-muted-foreground">Average completion by phase</p>
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-primary" /> Completed
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-muted" /> Remaining
              </span>
            </div>
          </div>

          {phaseProgress.length === 0 ? (
            <p className="text-sm text-muted-foreground">Create tasks to calculate progress.</p>
          ) : (
            <div className="space-y-2.5">
              {phaseProgress.map((phase) => (
                <div key={phase.phase}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-medium">{phase.phase}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {phase.value}% · {phase.taskCount} task{phase.taskCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <Progress value={phase.value} className="h-1.5" />
                </div>
              ))}
            </div>
          )}
        </div>
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
