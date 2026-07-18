import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock3,
  Eye,
  Plus,
  Search,
  Send,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { QueryError } from "@/components/query-error";
import { materialRequestsApi, type MaterialRequestResponse } from "@/api/materialRequests";
import { materialsApi } from "@/api/materials";
import { projectsApi } from "@/api/projects";
import { warehousesApi } from "@/api/warehouses";
import { tasksApi } from "@/api/tasks";
import { requireApiResult } from "@/api/client";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/app/material-requests")({
  head: () => ({ meta: [{ title: "Material Requests - BuildSense AI" }] }),
  component: MaterialRequestsPage,
});

type RequestLine = {
  key: number;
  variantKey: string;
  quantity: string;
  neededByDate: string;
};

let nextLineKey = 1;

function defaultNeededDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function newLine(): RequestLine {
  return {
    key: nextLineKey++,
    variantKey: "",
    quantity: "1",
    neededByDate: defaultNeededDate(),
  };
}

function responseMessage(result: unknown, fallback: string): string {
  return typeof result === "string" && result.trim() ? result : fallback;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function statusClass(status: string): string {
  if (status === "APPROVED" || status === "PARTIALLY_APPROVED")
    return "border-success/30 bg-success/10 text-success";
  if (status === "ISSUED" || status === "PARTIALLY_ISSUED")
    return "border-primary/30 bg-primary/10 text-primary";
  if (status === "RELEASED") return "border-muted-foreground/30 bg-muted text-muted-foreground";
  if (status === "REJECTED" || status === "CANCELLED")
    return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-warning/35 bg-warning/10 text-warning-foreground";
}

type RequestUrgency = {
  rank: number;
  label: string;
  className: string;
  neededBy: string | null;
};

function requestUrgency(request: MaterialRequestResponse): RequestUrgency {
  const validDates = (request.items ?? [])
    .map((item) => new Date(item.neededByDate))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());
  const earliest = validDates[0];
  if (!earliest) {
    return { rank: 4, label: "No date", className: "", neededBy: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  earliest.setHours(0, 0, 0, 0);
  const days = Math.round((earliest.getTime() - today.getTime()) / 86_400_000);

  if (request.status !== "PENDING") {
    return { rank: 3, label: "Processed", className: "", neededBy: earliest.toISOString() };
  }
  if (days < 0) {
    return {
      rank: 0,
      label: `${Math.abs(days)}d overdue`,
      className: "border-destructive/30 bg-destructive/10 text-destructive",
      neededBy: earliest.toISOString(),
    };
  }
  if (days === 0) {
    return {
      rank: 0,
      label: "Due today",
      className: "border-destructive/30 bg-destructive/10 text-destructive",
      neededBy: earliest.toISOString(),
    };
  }
  if (days <= 7) {
    return {
      rank: 1,
      label: `Due in ${days}d`,
      className: "border-warning/35 bg-warning/10 text-warning-foreground",
      neededBy: earliest.toISOString(),
    };
  }
  return {
    rank: 2,
    label: `Due in ${days}d`,
    className: "border-primary/25 bg-primary/5 text-primary",
    neededBy: earliest.toISOString(),
  };
}

function MaterialRequestsPage() {
  const session = useSession();
  const canReview = session?.role === "ADMIN" || session?.role === "WAREHOUSE_MANAGER";
  const canDecide = session?.role === "WAREHOUSE_MANAGER";
  const canCreate = session?.role === "PM";
  const workflowDescription =
    session?.role === "WAREHOUSE_MANAGER"
      ? "Review pending requests, then approve stock issue or reject and release reservations."
      : session?.role === "PM"
        ? "Request project materials and track the status of your submissions."
        : "Create material requests and oversee their approval workflow.";
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [createRequestOpen, setCreateRequestOpen] = useState(false);
  const [lines, setLines] = useState<RequestLine[]>(() => [newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState<"approve" | "reject" | "issue" | "release" | null>(
    null,
  );
  const [confirming, setConfirming] = useState<{
    action: "approve" | "reject" | "issue" | "release";
    request: MaterialRequestResponse;
  } | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [approvalWarehouseId, setApprovalWarehouseId] = useState("");
  const [approvedQuantities, setApprovedQuantities] = useState<Record<number, string>>({});
  const [statusFilter, setStatusFilter] = useState(canReview ? "PENDING" : "ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [urgencyFilter, setUrgencyFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [requestMutationBusy, setRequestMutationBusy] = useState(false);
  const [cancelRequest, setCancelRequest] = useState<{
    request: MaterialRequestResponse;
    reason: string;
  } | null>(null);
  const [editingRequest, setEditingRequest] = useState<{
    requestId: number;
    rowVersion: string;
    requestNote: string;
    items: {
      itemId: number;
      materialName: string;
      quantity: string;
      neededByDate: string;
      note?: string | null;
    }[];
  } | null>(null);
  const [remainderRequest, setRemainderRequest] = useState<MaterialRequestResponse | null>(null);
  const [remainderBusy, setRemainderBusy] = useState(false);

  const {
    data: projects = [],
    isLoading: projectsLoading,
    isError: projectsError,
    error: projectsErrorValue,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: async () =>
      requireApiResult(await projectsApi.getAll(), "Could not load projects") ?? [],
    enabled: !!session?.token,
    staleTime: 30_000,
  });

  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
    queryKey: ["warehouses", "managed"],
    queryFn: async () =>
      requireApiResult(await warehousesApi.getAll(), "Could not load managed warehouses") ?? [],
    enabled: !!session?.token && canDecide,
    staleTime: 30_000,
  });

  const {
    data: projectTasks = [],
    isLoading: tasksLoading,
    isError: tasksError,
    error: tasksErrorValue,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ["tasks", "material-request", projectId],
    queryFn: async () =>
      requireApiResult(
        await tasksApi.getByProject(Number(projectId)),
        "Could not load project tasks",
      ) ?? [],
    enabled: !!session?.token && canCreate && !!projectId,
    staleTime: 10_000,
  });

  const {
    data: requests = [],
    isLoading: requestsLoading,
    isError: requestsError,
    error: requestsErrorValue,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ["material-requests", projectFilter],
    queryFn: async () => {
      const response =
        projectFilter === "ALL"
          ? await materialRequestsApi.getAll()
          : await materialRequestsApi.getByProject(Number(projectFilter));
      return requireApiResult(response, "Could not load material requests") ?? [];
    },
    enabled: !!session?.token,
    staleTime: 10_000,
  });

  const {
    data: selectedRequest,
    isLoading: selectedRequestLoading,
    isError: selectedRequestError,
    error: selectedRequestErrorValue,
    refetch: refetchSelectedRequest,
  } = useQuery({
    queryKey: ["material-request", selectedRequestId],
    queryFn: async () =>
      requireApiResult(
        await materialRequestsApi.getById(selectedRequestId!),
        "Could not load request details",
      ),
    enabled: selectedRequestId !== null,
    staleTime: 10_000,
  });

  const accessibleProjects =
    session?.role === "PM"
      ? projects.filter((project) => project.pmUserID === session.userId)
      : projects;
  const accessibleProjectIds = new Set(accessibleProjects.map((project) => project.projectId));
  const roleScopedRequests = requests.filter(
    (request) =>
      (canReview || request.requestedBy === session?.userId) &&
      (canReview || accessibleProjectIds.has(request.projectId)),
  );
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleRequests = roleScopedRequests
    .filter((request) => statusFilter === "ALL" || request.status === statusFilter)
    .filter((request) => {
      const urgency = requestUrgency(request);
      if (urgencyFilter === "URGENT" && urgency.rank > 1) return false;
      if (urgencyFilter === "OVERDUE" && urgency.rank !== 0) return false;
      if (!normalizedSearch) return true;
      const projectName =
        projects.find((project) => project.projectId === request.projectId)?.projectName ?? "";
      return [
        String(request.requestId),
        projectName,
        request.requestedByName,
        ...(request.items ?? []).map((item) => item.materialName),
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    })
    .sort(
      (left, right) =>
        requestUrgency(left).rank - requestUrgency(right).rank ||
        new Date(right.requestDate).getTime() - new Date(left.requestDate).getTime(),
    );
  const pendingCount = roleScopedRequests.filter((request) => request.status === "PENDING").length;
  const urgentCount = roleScopedRequests.filter(
    (request) => request.status === "PENDING" && requestUrgency(request).rank <= 1,
  ).length;
  const processedCount = roleScopedRequests.length - pendingCount;
  const tasksWithActiveRequests = new Set(
    roleScopedRequests
      .filter((request) => ["PENDING", "APPROVED", "PARTIALLY_APPROVED"].includes(request.status))
      .map((request) => request.taskId)
      .filter((id): id is number => typeof id === "number"),
  );
  const eligibleRequestTasks = projectTasks.filter(
    (task) =>
      task.materialRequirements.length > 0 &&
      !["COMPLETED", "CANCELLED", "REJECTED"].includes(task.status) &&
      !tasksWithActiveRequests.has(task.taskId),
  );
  const selectedRequestTask = eligibleRequestTasks.find((task) => task.taskId === Number(taskId));

  const {
    data: materials = [],
    isLoading: materialsLoading,
    isError: materialsError,
    error: materialsErrorValue,
    refetch: refetchMaterials,
  } = useQuery({
    queryKey: ["materials"],
    queryFn: async () =>
      requireApiResult(await materialsApi.getAll(), "Could not load materials") ?? [],
    enabled: !!session?.token,
    staleTime: 30_000,
  });

  const plannedVariantIds = new Set(
    selectedRequestTask?.materialRequirements.map((requirement) => requirement.variantId) ?? [],
  );
  const variantOptions = materials.flatMap((material) => {
    const activeVariants = (material.variants ?? []).filter((variant) => variant.isActive);
    if (activeVariants.length > 0) {
      return activeVariants
        .filter((variant) => plannedVariantIds.has(variant.variantId))
        .map((variant) => ({
          key: `V:${variant.variantId}`,
          variantId: variant.variantId,
          materialId: material.materialId,
          label: `${material.materialName} - ${variant.variantName}`,
          unit: variant.unit || material.unit,
        }));
    }
    return selectedRequestTask
      ? []
      : [
          {
            key: `M:${material.materialId}`,
            variantId: 0,
            materialId: material.materialId,
            label: material.materialName,
            unit: material.unit,
          },
        ];
  });

  const selectTaskForRequest = (value: string) => {
    setTaskId(value);
    const task = eligibleRequestTasks.find((item) => item.taskId === Number(value));
    if (!task) {
      setLines([newLine()]);
      return;
    }
    const issuedByVariant = new Map<number, number>();
    roleScopedRequests
      .filter((request) => request.taskId === task.taskId)
      .flatMap((request) => request.items)
      .forEach((item) =>
        issuedByVariant.set(
          item.variantId,
          (issuedByVariant.get(item.variantId) ?? 0) + item.issuedQuantity,
        ),
      );
    const remainingLines = task.materialRequirements
      .map((requirement) => ({
        requirement,
        remaining: Math.max(
          0,
          requirement.grossQuantityRequired - (issuedByVariant.get(requirement.variantId) ?? 0),
        ),
      }))
      .filter(({ remaining }) => remaining > 0)
      .map(({ requirement, remaining }) => ({
        key: nextLineKey++,
        variantKey: `V:${requirement.variantId}`,
        quantity: String(remaining),
        neededByDate: task.baselineStart.slice(0, 10),
      }));
    setLines(remainingLines.length > 0 ? remainingLines : [newLine()]);
  };

  const updateLine = (key: number, update: Partial<RequestLine>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...update } : line)),
    );
  };

  const removeLine = (key: number) => {
    setLines((current) =>
      current.length === 1 ? current : current.filter((line) => line.key !== key),
    );
  };

  const submitRequest = async () => {
    if (!projectId || !taskId) {
      toast.error("Select a project and task");
      return;
    }
    if (
      lines.some((line) => !line.variantKey || !line.neededByDate || Number(line.quantity) <= 0)
    ) {
      toast.error("Complete every item with a positive quantity and needed-by date");
      return;
    }
    const variantKeys = lines.map((line) => line.variantKey);
    if (new Set(variantKeys).size !== variantKeys.length) {
      toast.error("Each material variant can only appear once per request");
      return;
    }

    setSubmitting(true);
    try {
      const response = await materialRequestsApi.create({
        projectId: Number(projectId),
        taskId: Number(taskId),
        items: lines.map((line) => ({
          ...(() => {
            const option = variantOptions.find((variant) => variant.key === line.variantKey)!;
            return { variantId: option.variantId, materialId: option.materialId };
          })(),
          quantity: Number(line.quantity),
          neededByDate: `${line.neededByDate}T00:00:00.000Z`,
        })),
      });

      if (response.isSuccess) {
        toast.success(responseMessage(response.result, "Material request created"));
        setCreateRequestOpen(false);
        setProjectId("");
        setTaskId("");
        setLines([newLine()]);
        refetchRequests();
      } else {
        toast.error(
          response.errorMessage ??
            responseMessage(response.result, "Could not create material request"),
        );
      }
    } catch {
      toast.error("Could not reach the backend. Check the API server and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const openDecision = (
    action: "approve" | "reject" | "issue" | "release",
    request: MaterialRequestResponse,
  ) => {
    setDecisionNote("");
    setApprovalWarehouseId(request.warehouseId ? String(request.warehouseId) : "");
    setApprovedQuantities(
      Object.fromEntries(request.items.map((item) => [item.itemId, String(item.quantity)])),
    );
    setConfirming({ action, request });
  };

  const processRequest = async (action: "approve" | "reject" | "issue" | "release") => {
    if (!confirming) return;
    const id = confirming.request.requestId;
    if (action === "approve") {
      if (!approvalWarehouseId) {
        toast.error("Select the warehouse that will reserve this stock");
        return;
      }
      const quantities = confirming.request.items.map((item) => ({
        itemId: item.itemId,
        approvedQuantity: Number(approvedQuantities[item.itemId] ?? 0),
      }));
      if (
        quantities.some(
          (item) => !Number.isFinite(item.approvedQuantity) || item.approvedQuantity < 0,
        ) ||
        quantities.every((item) => item.approvedQuantity === 0)
      ) {
        toast.error("Approve at least one positive quantity, or reject the request");
        return;
      }
      if (
        quantities.some((item) => {
          const requested =
            confirming.request.items.find((line) => line.itemId === item.itemId)?.quantity ?? 0;
          return item.approvedQuantity > requested;
        })
      ) {
        toast.error("Approved quantity cannot exceed requested quantity");
        return;
      }
    }
    setProcessing(action);
    try {
      const response =
        action === "approve"
          ? await materialRequestsApi.approve(id, {
              warehouseId: Number(approvalWarehouseId),
              decisionNote: decisionNote.trim() || undefined,
              items: confirming.request.items.map((item) => ({
                itemId: item.itemId,
                approvedQuantity: Number(approvedQuantities[item.itemId] ?? 0),
              })),
            })
          : action === "reject"
            ? await materialRequestsApi.reject(id, decisionNote.trim() || undefined)
            : action === "issue"
              ? await materialRequestsApi.issue(id)
              : await materialRequestsApi.release(id);

      if (response.isSuccess) {
        toast.success(responseMessage(response.result, `Request #${id} ${action}d`));
        setConfirming(null);
        refetchRequests();
      } else {
        toast.error(
          response.errorMessage ??
            responseMessage(response.result, `Could not ${action} request #${id}`),
        );
      }
    } catch {
      toast.error("Could not reach the backend. Check the API server and try again.");
    } finally {
      setProcessing(null);
    }
  };

  const cancelPendingRequest = (request: MaterialRequestResponse) => {
    setCancelRequest({ request, reason: "" });
  };

  const submitPendingCancellation = async () => {
    if (!cancelRequest) return;
    setRequestMutationBusy(true);
    try {
      const response = await materialRequestsApi.cancelPending(
        cancelRequest.request.requestId,
        cancelRequest.request.rowVersion,
        cancelRequest.reason.trim() || undefined,
      );
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Could not cancel material request");
        if (response.statusCode === 409) await refetchRequests();
        return;
      }
      toast.success(`Request #${cancelRequest.request.requestId} cancelled`);
      setCancelRequest(null);
      await refetchRequests();
    } finally {
      setRequestMutationBusy(false);
    }
  };

  const editPendingRequest = (request: MaterialRequestResponse) => {
    setEditingRequest({
      requestId: request.requestId,
      rowVersion: request.rowVersion,
      requestNote: request.requestNote ?? "",
      items: request.items.map((item) => ({
        itemId: item.itemId,
        materialName: item.materialName,
        quantity: String(item.quantity),
        neededByDate: item.neededByDate.slice(0, 10),
        note: item.note,
      })),
    });
  };

  const submitPendingEdit = async () => {
    if (!editingRequest) return;
    if (
      editingRequest.items.some(
        (item) =>
          !Number.isFinite(Number(item.quantity)) ||
          Number(item.quantity) <= 0 ||
          !item.neededByDate,
      )
    ) {
      toast.error("Every quantity and needed-by date must be valid");
      return;
    }
    setRequestMutationBusy(true);
    try {
      const response = await materialRequestsApi.updatePending(editingRequest.requestId, {
        rowVersion: editingRequest.rowVersion,
        requestNote: editingRequest.requestNote.trim() || undefined,
        items: editingRequest.items.map((item) => ({
          itemId: item.itemId,
          quantity: Number(item.quantity),
          neededByDate: item.neededByDate,
          note: item.note ?? undefined,
        })),
      });
      if (!response.isSuccess) toast.error(response.errorMessage ?? "Could not update request");
      else {
        toast.success(`Request #${editingRequest.requestId} updated`);
        setEditingRequest(null);
        await refetchRequests();
      }
    } finally {
      setRequestMutationBusy(false);
    }
  };

  const createRemainderRequest = async () => {
    if (!remainderRequest?.taskId) return;
    const request = remainderRequest;
    setRemainderBusy(true);
    try {
      const response = await materialRequestsApi.createFromTask(request.taskId);
      if (!response.isSuccess) {
        toast.error(
          response.errorMessage ??
            responseMessage(response.result, "Could not create the remainder request"),
        );
        return;
      }
      toast.success(`Follow-up request created for Task #${request.taskId}`);
      setRemainderRequest(null);
      await refetchRequests();
    } catch {
      toast.error("Could not reach the backend. Check the API server and try again.");
    } finally {
      setRemainderBusy(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        section="Operations"
        title="Material Requests"
        description={workflowDescription}
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => setCreateRequestOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New request
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <RequestMetric
            icon={Clock3}
            label={canReview ? "Pending review" : "My pending requests"}
            value={pendingCount}
          />
          <RequestMetric
            icon={AlertTriangle}
            label="Due within 7 days"
            value={urgentCount}
            urgent={urgentCount > 0}
          />
          <RequestMetric icon={Check} label="Processed" value={processedCount} />
        </div>

        {canCreate && (
          <Dialog open={createRequestOpen} onOpenChange={setCreateRequestOpen}>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New material request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {(projectsError || materialsError || tasksError) && (
                  <QueryError
                    message={
                      projectsErrorValue instanceof Error
                        ? projectsErrorValue.message
                        : materialsErrorValue instanceof Error
                          ? materialsErrorValue.message
                          : tasksErrorValue instanceof Error
                            ? tasksErrorValue.message
                            : undefined
                    }
                    onRetry={() => {
                      refetchProjects();
                      refetchMaterials();
                      if (projectId) refetchTasks();
                    }}
                  />
                )}
                <div>
                  <Label id="request-project-label">Project</Label>
                  <Select
                    value={projectId}
                    onValueChange={(value) => {
                      setProjectId(value);
                      setTaskId("");
                      setLines([newLine()]);
                    }}
                    disabled={projectsLoading || submitting}
                  >
                    <SelectTrigger aria-labelledby="request-project-label">
                      <SelectValue
                        placeholder={projectsLoading ? "Loading projects..." : "Select project"}
                      />
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

                <div>
                  <Label id="request-task-label">Task material plan</Label>
                  <Select
                    value={taskId}
                    onValueChange={selectTaskForRequest}
                    disabled={!projectId || tasksLoading || submitting}
                  >
                    <SelectTrigger aria-labelledby="request-task-label">
                      <SelectValue
                        placeholder={
                          !projectId
                            ? "Select a project first"
                            : tasksLoading
                              ? "Loading tasks..."
                              : "Select task"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleRequestTasks.map((task) => (
                        <SelectItem key={task.taskId} value={String(task.taskId)}>
                          {task.taskName} ({task.phaseName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {projectId && !tasksLoading && eligibleRequestTasks.length === 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      No task with an available material plan can accept a new request.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Requested materials</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => setLines((current) => [...current, newLine()])}
                      disabled={submitting || !taskId || variantOptions.length === 0}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add item
                    </Button>
                  </div>

                  {lines.map((line, index) => (
                    <div
                      key={line.key}
                      className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(0,1fr)_130px_170px_36px]"
                    >
                      <div>
                        <Label id={`request-material-${line.key}`} className="text-xs">
                          Material {index + 1}
                        </Label>
                        <Select
                          value={line.variantKey}
                          onValueChange={(value) => updateLine(line.key, { variantKey: value })}
                          disabled={!taskId || materialsLoading || submitting}
                        >
                          <SelectTrigger aria-labelledby={`request-material-${line.key}`}>
                            <SelectValue
                              placeholder={materialsLoading ? "Loading..." : "Select material"}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {variantOptions.map((variant) => (
                              <SelectItem
                                key={variant.key}
                                value={variant.key}
                                disabled={lines.some(
                                  (other) =>
                                    other.key !== line.key && other.variantKey === variant.key,
                                )}
                              >
                                {variant.label} ({variant.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor={`request-quantity-${line.key}`} className="text-xs">
                          Quantity
                        </Label>
                        <Input
                          id={`request-quantity-${line.key}`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={line.quantity}
                          onChange={(event) =>
                            updateLine(line.key, { quantity: event.target.value })
                          }
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`request-date-${line.key}`} className="text-xs">
                          Needed by
                        </Label>
                        <Input
                          id={`request-date-${line.key}`}
                          type="date"
                          min={new Date().toISOString().slice(0, 10)}
                          value={line.neededByDate}
                          onChange={(event) =>
                            updateLine(line.key, { neededByDate: event.target.value })
                          }
                          disabled={submitting}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-destructive"
                          onClick={() => removeLine(line.key)}
                          disabled={lines.length === 1 || submitting}
                          aria-label={`Remove material ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {taskId && !materialsLoading && variantOptions.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    This task has no active material variants available to request.
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateRequestOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitRequest}
                  disabled={
                    submitting ||
                    accessibleProjects.length === 0 ||
                    !taskId ||
                    variantOptions.length === 0
                  }
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  {submitting ? "Submitting..." : "Submit request"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <Dialog
          open={editingRequest !== null}
          onOpenChange={(open) => !open && setEditingRequest(null)}
        >
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit material request #{editingRequest?.requestId}</DialogTitle>
            </DialogHeader>
            {editingRequest && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-request-note">Request note</Label>
                  <Textarea
                    id="edit-request-note"
                    value={editingRequest.requestNote}
                    onChange={(event) =>
                      setEditingRequest((current) =>
                        current ? { ...current, requestNote: event.target.value } : current,
                      )
                    }
                    maxLength={1000}
                  />
                </div>
                <div className="space-y-2">
                  {editingRequest.items.map((item, index) => (
                    <div
                      key={item.itemId}
                      className="grid gap-3 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_130px_170px]"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.materialName}</p>
                        <p className="text-xs text-muted-foreground">Request item {index + 1}</p>
                      </div>
                      <div>
                        <Label htmlFor={`edit-request-quantity-${item.itemId}`}>Quantity</Label>
                        <Input
                          id={`edit-request-quantity-${item.itemId}`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(event) =>
                            setEditingRequest((current) =>
                              current
                                ? {
                                    ...current,
                                    items: current.items.map((line) =>
                                      line.itemId === item.itemId
                                        ? { ...line, quantity: event.target.value }
                                        : line,
                                    ),
                                  }
                                : current,
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-request-date-${item.itemId}`}>Needed by</Label>
                        <Input
                          id={`edit-request-date-${item.itemId}`}
                          type="date"
                          value={item.neededByDate}
                          onChange={(event) =>
                            setEditingRequest((current) =>
                              current
                                ? {
                                    ...current,
                                    items: current.items.map((line) =>
                                      line.itemId === item.itemId
                                        ? { ...line, neededByDate: event.target.value }
                                        : line,
                                    ),
                                  }
                                : current,
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingRequest(null)}
                disabled={requestMutationBusy}
              >
                Cancel
              </Button>
              <Button onClick={submitPendingEdit} disabled={requestMutationBusy}>
                {requestMutationBusy ? "Saving..." : "Save request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={cancelRequest !== null}
          onOpenChange={(open) => !open && setCancelRequest(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel material request #{cancelRequest?.request.requestId}</DialogTitle>
            </DialogHeader>
            <div>
              <Label htmlFor="cancel-request-reason">Cancellation reason</Label>
              <Textarea
                id="cancel-request-reason"
                value={cancelRequest?.reason ?? ""}
                onChange={(event) =>
                  setCancelRequest((current) =>
                    current ? { ...current, reason: event.target.value } : current,
                  )
                }
                maxLength={1000}
                placeholder="Optional reason"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCancelRequest(null)}
                disabled={requestMutationBusy}
              >
                Keep request
              </Button>
              <Button
                variant="destructive"
                onClick={submitPendingCancellation}
                disabled={requestMutationBusy}
              >
                {requestMutationBusy ? "Cancelling..." : "Cancel request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                {canReview ? "Material request queue" : "My material requests"}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {canReview
                  ? "Review pending requests and track processed requests."
                  : "Track the status of requests you submitted."}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search requests..."
                  className="w-48 pl-8"
                  aria-label="Search material requests"
                />
              </div>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-44" aria-label="Filter requests by project">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All projects</SelectItem>
                  {accessibleProjects.map((project) => (
                    <SelectItem key={project.projectId} value={String(project.projectId)}>
                      {project.projectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="w-36" aria-label="Filter requests by urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Any urgency</SelectItem>
                  <SelectItem value="URGENT">Due in 7 days</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36" aria-label="Filter requests by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PARTIALLY_APPROVED">Partially approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="ISSUED">Issued</SelectItem>
                  <SelectItem value="PARTIALLY_ISSUED">Partially issued</SelectItem>
                  <SelectItem value="RELEASED">Released</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {requestsLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Loading material requests...
              </div>
            ) : requestsError ? (
              <QueryError
                message={
                  requestsErrorValue instanceof Error ? requestsErrorValue.message : undefined
                }
                onRetry={() => refetchRequests()}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Requested by</TableHead>
                    <TableHead>Materials</TableHead>
                    <TableHead>Needed by</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No {statusFilter === "ALL" ? "" : statusFilter.toLowerCase()} material
                        requests found.
                      </TableCell>
                    </TableRow>
                  )}
                  {visibleRequests.map((request) => (
                    <TableRow key={request.requestId}>
                      <TableCell className="font-mono text-xs">
                        <p>#{request.requestId}</p>
                        {request.taskId && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            Task #{request.taskId}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {projects.find((project) => project.projectId === request.projectId)
                          ?.projectName ?? `Project #${request.projectId}`}
                      </TableCell>
                      <TableCell className="text-sm">
                        {request.requestedByName || `User #${request.requestedBy}`}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {(request.items ?? []).map((item) => (
                            <p key={item.itemId} className="text-xs">
                              {item.materialName}{" "}
                              <span className="text-muted-foreground">
                                × {item.quantity} {item.unit ?? ""}
                              </span>
                            </p>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const urgency = requestUrgency(request);
                          return (
                            <div className="space-y-1">
                              <p className="text-xs">{formatDate(urgency.neededBy ?? "")}</p>
                              <Badge variant="outline" className={urgency.className}>
                                {urgency.label}
                              </Badge>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(request.requestDate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusClass(request.status)}>
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={() => setSelectedRequestId(request.requestId)}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            Details
                          </Button>
                          {canDecide && request.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs"
                                onClick={() => openDecision("approve", request)}
                                disabled={processing !== null}
                              >
                                <Check className="mr-1 h-3.5 w-3.5" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-destructive"
                                onClick={() => openDecision("reject", request)}
                                disabled={processing !== null}
                              >
                                <X className="mr-1 h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </>
                          )}
                          {canCreate &&
                            request.requestedBy === session?.userId &&
                            request.status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs"
                                  onClick={() => editPendingRequest(request)}
                                  disabled={processing !== null}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs text-destructive"
                                  onClick={() => cancelPendingRequest(request)}
                                  disabled={processing !== null}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                          {canCreate &&
                            request.requestedBy === session?.userId &&
                            request.status === "PARTIALLY_ISSUED" &&
                            request.taskId &&
                            !roleScopedRequests.some(
                              (other) =>
                                other.requestId !== request.requestId &&
                                other.taskId === request.taskId &&
                                ["PENDING", "APPROVED", "PARTIALLY_APPROVED"].includes(
                                  other.status,
                                ),
                            ) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => setRemainderRequest(request)}
                                disabled={remainderBusy}
                              >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Request remainder
                              </Button>
                            )}
                          {canDecide &&
                            (request.status === "APPROVED" ||
                              request.status === "PARTIALLY_APPROVED") && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs"
                                  onClick={() => openDecision("issue", request)}
                                  disabled={processing !== null}
                                >
                                  Issue
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs text-destructive"
                                  onClick={() => openDecision("release", request)}
                                  disabled={processing !== null}
                                >
                                  Release
                                </Button>
                              </>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog
        open={selectedRequestId !== null}
        onOpenChange={(open) => !open && setSelectedRequestId(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Material request #{selectedRequestId}</DialogTitle>
          </DialogHeader>
          {selectedRequestLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading request details...
            </div>
          ) : selectedRequestError ? (
            <QueryError
              message={
                selectedRequestErrorValue instanceof Error
                  ? selectedRequestErrorValue.message
                  : undefined
              }
              onRetry={() => refetchSelectedRequest()}
            />
          ) : selectedRequest ? (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Project</p>
                  <p className="font-medium">
                    {projects.find((project) => project.projectId === selectedRequest.projectId)
                      ?.projectName ?? `Project #${selectedRequest.projectId}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Requested by</p>
                  <p className="font-medium">
                    {selectedRequest.requestedByName || `User #${selectedRequest.requestedBy}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Requested on</p>
                  <p className="font-medium">{formatDate(selectedRequest.requestDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Source task</p>
                  <p className="font-medium">
                    {selectedRequest.taskId ? `Task #${selectedRequest.taskId}` : "Manual request"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className={statusClass(selectedRequest.status)}>
                      {selectedRequest.status}
                    </Badge>
                    {selectedRequest.status === "PENDING" && (
                      <Badge
                        variant="outline"
                        className={requestUrgency(selectedRequest).className}
                      >
                        {requestUrgency(selectedRequest).label}
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Warehouse</p>
                  <p className="font-medium">
                    {selectedRequest.warehouseName ??
                      (selectedRequest.warehouseId
                        ? `Warehouse #${selectedRequest.warehouseId}`
                        : "Unassigned")}
                  </p>
                </div>
                {selectedRequest.decisionNote && (
                  <div>
                    <p className="text-xs text-muted-foreground">Decision note</p>
                    <p className="font-medium">{selectedRequest.decisionNote}</p>
                  </div>
                )}
              </div>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Approved</TableHead>
                      <TableHead className="text-right">Issued</TableHead>
                      <TableHead>Needed by</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedRequest.items ?? []).map((item) => (
                      <TableRow key={item.itemId}>
                        <TableCell className="font-medium">
                          {item.materialName}
                          {item.variantName && (
                            <p className="text-xs text-muted-foreground">{item.variantName}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.quantity} {item.unit ?? ""}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.approvedQuantity} {item.unit ?? ""}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.issuedQuantity} {item.unit ?? ""}
                        </TableCell>
                        <TableCell>{formatDate(item.neededByDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => !open && !processing && setConfirming(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {confirming?.action} material request #{confirming?.request.requestId}
            </DialogTitle>
          </DialogHeader>
          {confirming?.action === "approve" && (
            <div className="space-y-3">
              <div>
                <Label>Managed warehouse</Label>
                <Select
                  value={approvalWarehouseId}
                  onValueChange={setApprovalWarehouseId}
                  disabled={warehousesLoading || !!confirming.request.warehouseId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses
                      .filter(
                        (warehouse) =>
                          !confirming.request.warehouseId ||
                          warehouse.warehouseId === confirming.request.warehouseId,
                      )
                      .map((warehouse) => (
                        <SelectItem
                          key={warehouse.warehouseId}
                          value={String(warehouse.warehouseId)}
                        >
                          {warehouse.warehouseName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {confirming.request.warehouseId && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    This request is already assigned; its warehouse cannot be changed in the UI.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                {confirming.request.items.map((item) => (
                  <div
                    key={item.itemId}
                    className="grid grid-cols-[1fr_140px] items-end gap-3 rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.materialName}</p>
                      <p className="text-xs text-muted-foreground">
                        Requested {item.quantity} {item.unit ?? ""}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor={`approved-${item.itemId}`}>Approve quantity</Label>
                      <Input
                        id={`approved-${item.itemId}`}
                        type="number"
                        min="0"
                        max={item.quantity}
                        step="0.01"
                        value={approvedQuantities[item.itemId] ?? "0"}
                        onChange={(event) =>
                          setApprovedQuantities((current) => ({
                            ...current,
                            [item.itemId]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(confirming?.action === "approve" || confirming?.action === "reject") && (
            <div>
              <Label htmlFor="decision-note">Decision note</Label>
              <Textarea
                id="decision-note"
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
                maxLength={1000}
              />
            </div>
          )}
          {confirming?.action === "issue" && (
            <p className="text-sm text-muted-foreground">
              Reserved stock will leave the assigned warehouse and the request will be marked
              issued.
            </p>
          )}
          {confirming?.action === "release" && (
            <p className="text-sm text-muted-foreground">
              All active reservations will be released without issuing stock.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirming(null)}
              disabled={processing !== null}
            >
              Cancel
            </Button>
            <Button
              variant={
                confirming?.action === "reject" || confirming?.action === "release"
                  ? "destructive"
                  : "default"
              }
              onClick={() => confirming && processRequest(confirming.action)}
              disabled={processing !== null}
            >
              {processing ? "Processing..." : `${confirming?.action ?? "Confirm"} request`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={remainderRequest !== null}
        onOpenChange={(open) => !open && !remainderBusy && setRemainderRequest(null)}
        title={`Request remaining materials for Task #${remainderRequest?.taskId ?? ""}?`}
        description="This creates a new pending request from the task quantities that have not yet been issued. Use it after the shortage purchase has been received into warehouse stock. The original request remains partially issued for audit history."
        confirmLabel="Create follow-up request"
        onConfirm={createRemainderRequest}
        busy={remainderBusy}
      />
    </div>
  );
}

function RequestMetric({
  icon: Icon,
  label,
  value,
  urgent = false,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  urgent?: boolean;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={
            urgent
              ? "rounded-lg bg-warning/15 p-2 text-warning-foreground"
              : "rounded-lg bg-primary/10 p-2 text-primary"
          }
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
