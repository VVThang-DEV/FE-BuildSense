import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Eye, Plus, Send, Trash2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { requireApiResult } from "@/api/client";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/app/material-requests")({
  head: () => ({ meta: [{ title: "Material Requests - BuildSense AI" }] }),
  component: MaterialRequestsPage,
});

type RequestLine = {
  key: number;
  materialId: string;
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
    materialId: "",
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
  if (status === "APPROVED") return "border-success/30 bg-success/10 text-success";
  if (status === "REJECTED") return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-warning/35 bg-warning/10 text-warning-foreground";
}

function MaterialRequestsPage() {
  const session = useSession();
  const canReview = session?.role === "ADMIN" || session?.role === "WAREHOUSE_MANAGER";
  const canCreate = session?.role === "ADMIN" || session?.role === "PM";
  const workflowDescription =
    session?.role === "WAREHOUSE_MANAGER"
      ? "Review pending requests, then approve stock issue or reject and release reservations."
      : session?.role === "PM"
        ? "Request project materials and track the status of your submissions."
        : "Create material requests and oversee their approval workflow.";
  const [projectId, setProjectId] = useState("");
  const [lines, setLines] = useState<RequestLine[]>(() => [newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState<"approve" | "reject" | null>(null);
  const [confirming, setConfirming] = useState<{
    action: "approve" | "reject";
    request: MaterialRequestResponse;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState(canReview ? "PENDING" : "ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

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

  const visibleRequests = requests
    .filter((request) => canReview || request.requestedBy === session?.userId)
    .filter((request) => statusFilter === "ALL" || request.status === statusFilter)
    .sort(
      (left, right) => new Date(right.requestDate).getTime() - new Date(left.requestDate).getTime(),
    );

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
    if (!projectId) {
      toast.error("Select a project");
      return;
    }
    if (
      lines.some((line) => !line.materialId || !line.neededByDate || Number(line.quantity) <= 0)
    ) {
      toast.error("Complete every item with a positive quantity and needed-by date");
      return;
    }
    const materialIds = lines.map((line) => line.materialId);
    if (new Set(materialIds).size !== materialIds.length) {
      toast.error("Each material can only appear once per request");
      return;
    }

    setSubmitting(true);
    try {
      const response = await materialRequestsApi.create({
        projectId: Number(projectId),
        items: lines.map((line) => ({
          materialId: Number(line.materialId),
          quantity: Number(line.quantity),
          neededByDate: `${line.neededByDate}T00:00:00.000Z`,
        })),
      });

      if (response.isSuccess) {
        toast.success(responseMessage(response.result, "Material request created"));
        setProjectId("");
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

  const processRequest = async (action: "approve" | "reject") => {
    if (!confirming) return;
    const id = confirming.request.requestId;
    setProcessing(action);
    try {
      const response =
        action === "approve"
          ? await materialRequestsApi.approve(id)
          : await materialRequestsApi.reject(id);

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

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        section="Operations"
        title="Material Requests"
        description={workflowDescription}
      />

      <div className="space-y-4">
        {canCreate && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">New material request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(projectsError || materialsError) && (
                <QueryError
                  message={
                    projectsErrorValue instanceof Error
                      ? projectsErrorValue.message
                      : materialsErrorValue instanceof Error
                        ? materialsErrorValue.message
                        : undefined
                  }
                  onRetry={() => {
                    refetchProjects();
                    refetchMaterials();
                  }}
                />
              )}
              <div>
                <Label id="request-project-label">Project</Label>
                <Select
                  value={projectId}
                  onValueChange={setProjectId}
                  disabled={projectsLoading || submitting}
                >
                  <SelectTrigger aria-labelledby="request-project-label">
                    <SelectValue
                      placeholder={projectsLoading ? "Loading projects..." : "Select project"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.projectId} value={String(project.projectId)}>
                        {project.projectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    disabled={submitting || materials.length === 0}
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
                        value={line.materialId}
                        onValueChange={(value) => updateLine(line.key, { materialId: value })}
                        disabled={materialsLoading || submitting}
                      >
                        <SelectTrigger aria-labelledby={`request-material-${line.key}`}>
                          <SelectValue
                            placeholder={materialsLoading ? "Loading..." : "Select material"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {materials.map((material) => (
                            <SelectItem
                              key={material.materialId}
                              value={String(material.materialId)}
                              disabled={lines.some(
                                (other) =>
                                  other.key !== line.key &&
                                  other.materialId === String(material.materialId),
                              )}
                            >
                              {material.materialName} ({material.unit})
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
                        onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
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

              {!materialsLoading && materials.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No materials are available. Add materials to the catalog first.
                </p>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={submitRequest}
                  disabled={submitting || projects.length === 0 || materials.length === 0}
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  {submitting ? "Submitting..." : "Submit request"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-44" aria-label="Filter requests by project">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.projectId} value={String(project.projectId)}>
                      {project.projectName}
                    </SelectItem>
                  ))}
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
                  <SelectItem value="REJECTED">Rejected</SelectItem>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        No {statusFilter === "ALL" ? "" : statusFilter.toLowerCase()} material
                        requests found.
                      </TableCell>
                    </TableRow>
                  )}
                  {visibleRequests.map((request) => (
                    <TableRow key={request.requestId}>
                      <TableCell className="font-mono text-xs">#{request.requestId}</TableCell>
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
                              <span className="text-muted-foreground">× {item.quantity}</span>
                            </p>
                          ))}
                        </div>
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
                          {canReview && request.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs"
                                onClick={() => setConfirming({ action: "approve", request })}
                                disabled={processing !== null}
                              >
                                <Check className="mr-1 h-3.5 w-3.5" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-destructive"
                                onClick={() => setConfirming({ action: "reject", request })}
                                disabled={processing !== null}
                              >
                                <X className="mr-1 h-3.5 w-3.5" />
                                Reject
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
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={statusClass(selectedRequest.status)}>
                    {selectedRequest.status}
                  </Badge>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Needed by</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedRequest.items ?? []).map((item) => (
                      <TableRow key={item.itemId}>
                        <TableCell className="font-medium">{item.materialName}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
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
      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && !processing && setConfirming(null)}
        title={`${confirming?.action === "approve" ? "Approve" : "Reject"} material request?`}
        description={`This will ${confirming?.action === "approve" ? "issue reserved stock for" : "release reserved stock from"} request #${confirming?.request.requestId ?? ""}.`}
        confirmLabel={confirming?.action === "approve" ? "Approve request" : "Reject request"}
        destructive={confirming?.action === "reject"}
        busy={processing !== null}
        onConfirm={() => confirming && processRequest(confirming.action)}
      />
    </div>
  );
}
