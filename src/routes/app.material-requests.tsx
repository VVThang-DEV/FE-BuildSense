import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Plus, Send, Trash2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { materialRequestsApi } from "@/api/materialRequests";
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

function MaterialRequestsPage() {
  const session = useSession();
  const canReview = session?.role === "ADMIN" || session?.role === "WAREHOUSE_MANAGER";
  const [projectId, setProjectId] = useState("");
  const [lines, setLines] = useState<RequestLine[]>(() => [newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [processing, setProcessing] = useState<"approve" | "reject" | null>(null);
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);

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
    const id = Number(requestId);
    setProcessing(action);
    try {
      const response =
        action === "approve"
          ? await materialRequestsApi.approve(id)
          : await materialRequestsApi.reject(id);

      if (response.isSuccess) {
        toast.success(responseMessage(response.result, `Request #${id} ${action}d`));
        setRequestId("");
        setConfirming(null);
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

  const requestConfirmation = (action: "approve" | "reject") => {
    const id = Number(requestId);
    if (!Number.isInteger(id) || id <= 0) {
      toast.error("Enter a valid request ID");
      return;
    }
    setConfirming(action);
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        section="Operations"
        title="Material Requests"
        description="Reserve materials for a project and process pending requests."
      />

      <div
        className={`grid gap-4 ${canReview ? "xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]" : ""}`}
      >
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

        {canReview && (
          <Card className="shadow-sm h-fit">
            <CardHeader>
              <CardTitle className="text-base">Process a request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter a pending request ID to approve its stock issue or reject it and release the
                reserved stock.
              </p>
              <div>
                <Label htmlFor="material-request-id">Request ID</Label>
                <Input
                  id="material-request-id"
                  type="number"
                  min="1"
                  step="1"
                  value={requestId}
                  onChange={(event) => setRequestId(event.target.value)}
                  placeholder="e.g. 1042"
                  disabled={processing !== null}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => requestConfirmation("approve")}
                  disabled={processing !== null || !requestId}
                >
                  <Check className="h-4 w-4 mr-1" />{" "}
                  {processing === "approve" ? "Approving..." : "Approve"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => requestConfirmation("reject")}
                  disabled={processing !== null || !requestId}
                >
                  <X className="h-4 w-4 mr-1" />{" "}
                  {processing === "reject" ? "Rejecting..." : "Reject"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A pending-request list cannot be shown until the backend provides a Material Request
                GET endpoint.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && !processing && setConfirming(null)}
        title={`${confirming === "approve" ? "Approve" : "Reject"} material request?`}
        description={`This will ${confirming === "approve" ? "issue reserved stock for" : "release reserved stock from"} request #${requestId}.`}
        confirmLabel={confirming === "approve" ? "Approve request" : "Reject request"}
        destructive={confirming === "reject"}
        busy={processing !== null}
        onConfirm={() => confirming && processRequest(confirming)}
      />
    </div>
  );
}
