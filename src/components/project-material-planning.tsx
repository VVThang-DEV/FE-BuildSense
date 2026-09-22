import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, Boxes, Calculator, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { projectsApi } from "@/api/projects";
import { requireApiResult } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QueryError } from "@/components/query-error";
import { warehousesApi } from "@/api/warehouses";
import { useSession } from "@/lib/session";
import { isClosedProjectStatus } from "@/lib/utils";

// Thrown from queryFns when the backend 409s on a closed project so the UI
// can render a friendly read-only state instead of an error panel.
const CLOSED_PROJECT_MARKER = "CLOSED_PROJECT_READ_ONLY";

export function ProjectMaterialPlanning({
  projectId,
  projectStatus,
}: {
  projectId: number;
  projectStatus?: string;
}) {
  const isClosedProject = isClosedProjectStatus(projectStatus);
  const queryClient = useQueryClient();
  const session = useSession();
  const [runningMrp, setRunningMrp] = useState(false);
  const warehousesQuery = useQuery({
    queryKey: ["warehouses", "mrp-scope"],
    queryFn: async () =>
      requireApiResult(await warehousesApi.getAll(), "Could not load warehouses") ?? [],
    enabled: projectId > 0 && (session?.role === "WAREHOUSE_MANAGER" || session?.role === "ADMIN"),
  });
  const activeWarehouse =
    (warehousesQuery.data ?? []).find((w) => w.isActive) ?? warehousesQuery.data?.[0];
  const requirementsQuery = useQuery({
    queryKey: ["project-material-requirements", projectId],
    queryFn: async () => {
      const response = await projectsApi.getMaterialRequirements(projectId);
      if (response.statusCode === 409 && isClosedProject) throw new Error(CLOSED_PROJECT_MARKER);
      return requireApiResult(response, "Could not load material requirements") ?? [];
    },
    enabled: projectId > 0,
    staleTime: 10_000,
    retry: (count, error) =>
      error instanceof Error && error.message === CLOSED_PROJECT_MARKER ? false : count < 2,
  });
  const mrpQuery = useQuery({
    queryKey: ["project-mrp", projectId],
    queryFn: async () => {
      const response = await projectsApi.getLatestMrp(projectId);
      if (response.statusCode === 404) return [];
      if (response.statusCode === 409 && isClosedProject) throw new Error(CLOSED_PROJECT_MARKER);
      return requireApiResult(response, "Could not load the latest MRP run") ?? [];
    },
    enabled: projectId > 0,
    staleTime: 10_000,
    retry: (count, error) =>
      error instanceof Error && error.message === CLOSED_PROJECT_MARKER ? false : count < 2,
  });

  const runMrp = async () => {
    if (isClosedProject) {
      toast.error("This project is closed — MRP cannot be recalculated on closed projects");
      return;
    }
    setRunningMrp(true);
    try {
      const result = requireApiResult(await projectsApi.runMrp(projectId), "Could not run MRP") ?? [];
      queryClient.setQueryData(["project-mrp", projectId], result);
      toast.success(
        result[0]
          ? `MRP planning run version ${result[0].planningVersion} created`
          : "MRP completed with no material requirements",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not run MRP");
    } finally {
      setRunningMrp(false);
    }
  };

  const requirements = requirementsQuery.data ?? [];
  const mrp = mrpQuery.data ?? [];
  const unitByMaterial = new Map(requirements.map((item) => [item.materialId, item.unit]));

  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Boxes className="h-4 w-4 text-primary" /> Material plan
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Gross material requirements assigned across project tasks.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {requirementsQuery.isLoading ? (
            <LoadingLine label="Loading material plan..." />
          ) : requirementsQuery.isError ? (
            isClosedMarker(requirementsQuery.error) ? (
              <ClosedProjectNote label="Material requirements can't be recalculated for a closed project. The task plan above stays visible for reference." />
            ) : (
              <QueryError
                message={
                  requirementsQuery.error instanceof Error
                    ? requirementsQuery.error.message
                    : undefined
                }
                onRetry={() => requirementsQuery.refetch()}
              />
            )
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Gross quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requirements.length === 0 && <EmptyRow columns={3} label="No planned materials" />}
                {requirements.map((item, index) => (
                  <TableRow key={`${item.taskName ?? "task"}-${item.materialId}-${index}`}>
                    <TableCell className="text-sm">{item.taskName || "-"}</TableCell>
                    <TableCell className="font-medium">
                      {item.materialName}
                      {item.variantName && (
                        <p className="text-xs font-normal text-muted-foreground">
                          {item.variantName}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.grossQuantityRequired.toLocaleString()} {item.unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm xl:col-span-2">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4 text-primary" /> Estimated MRP
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-warning/40 bg-warning/10 text-warning-foreground"
              >
                {activeWarehouse
                  ? `Active warehouse · ${activeWarehouse.warehouseName}`
                  : "Active warehouse"}
              </Badge>
              {mrp[0] && (
                <Badge variant="secondary">
                  Run v{mrp[0].planningVersion} · #{mrp[0].planningRunId}
                </Badge>
              )}
              {(session?.role === "PM" || session?.role === "WAREHOUSE_MANAGER") && !isClosedProject && (
                <Button size="sm" variant="outline" onClick={runMrp} disabled={runningMrp || projectId <= 0}>
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${runningMrp ? "animate-spin" : ""}`} />
                {runningMrp ? "Running..." : "Run MRP"}
              </Button>
              )}
            </div>
          </div>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-foreground" />
            MRP now deducts issued quantities and counts only this project&apos;s active
            reservations and open orders. MRP always runs against the single active warehouse.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {mrpQuery.isLoading ? (
            <LoadingLine label="Loading latest MRP run..." />
          ) : mrpQuery.isError ? (
            isClosedMarker(mrpQuery.error) ? (
              <ClosedProjectNote label="MRP can't be recalculated for a closed project. The last saved run is no longer served — the task plan stays visible for reference." />
            ) : (
              <QueryError
                message={mrpQuery.error instanceof Error ? mrpQuery.error.message : undefined}
                onRetry={() => mrpQuery.refetch()}
              />
            )
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Issued</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">On hand</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">On order</TableHead>
                  <TableHead className="text-right">To buy</TableHead>
                  <TableHead>Need date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mrp.length === 0 && (
                  <EmptyRow columns={10} label="No saved MRP run. Use Run MRP to calculate one." />
                )}
                {mrp.map((item) => {
                  const unit = item.unit || unitByMaterial.get(item.materialId) || "";
                  return (
                    <TableRow key={item.variantId || item.materialId}>
                      <TableCell className="font-medium">
                        {item.materialName}
                        {item.variantName && (
                          <p className="text-xs text-muted-foreground">{item.variantName}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.totalGrossRequired.toLocaleString()} {unit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.issuedToProjectTasks.toLocaleString()} {unit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.remainingGrossRequired.toLocaleString()} {unit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.currentInventory.toLocaleString()} {unit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(item.reservedQuantity ?? 0).toLocaleString()} {unit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(item.availableQuantity ?? item.currentInventory).toLocaleString()}{" "}
                        {unit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(item.onOrderQuantity ?? 0).toLocaleString()} {unit}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {item.netQuantityRequired.toLocaleString()} {unit}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(item.earliestStartDate)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function isClosedMarker(error: unknown): boolean {
  return error instanceof Error && error.message === CLOSED_PROJECT_MARKER;
}

function ClosedProjectNote({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-1.5 p-8 text-center text-xs text-muted-foreground">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-foreground" />
      <p className="text-left">{label}</p>
    </div>
  );
}

function LoadingLine({ label }: { label: string }) {
  return <div className="p-8 text-center text-sm text-muted-foreground">{label}</div>;
}

function EmptyRow({ columns, label }: { columns: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={columns} className="py-8 text-center text-muted-foreground">
        {label}
      </TableCell>
    </TableRow>
  );
}
