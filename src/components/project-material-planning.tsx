import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Boxes, Calculator } from "lucide-react";
import { projectsApi } from "@/api/projects";
import { requireApiResult } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QueryError } from "@/components/query-error";

export function ProjectMaterialPlanning({ projectId }: { projectId: number }) {
  const requirementsQuery = useQuery({
    queryKey: ["project-material-requirements", projectId],
    queryFn: async () =>
      requireApiResult(
        await projectsApi.getMaterialRequirements(projectId),
        "Could not load material requirements",
      ) ?? [],
    enabled: projectId > 0,
    staleTime: 10_000,
  });
  const mrpQuery = useQuery({
    queryKey: ["project-mrp", projectId],
    queryFn: async () =>
      requireApiResult(await projectsApi.calculateMrp(projectId), "Could not calculate MRP") ?? [],
    enabled: projectId > 0,
    staleTime: 10_000,
  });

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
            <QueryError
              message={
                requirementsQuery.error instanceof Error
                  ? requirementsQuery.error.message
                  : undefined
              }
              onRetry={() => requirementsQuery.refetch()}
            />
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
                    <TableCell className="font-medium">{item.materialName}</TableCell>
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
            <Badge
              variant="outline"
              className="border-warning/40 bg-warning/10 text-warning-foreground"
            >
              Estimate only
            </Badge>
          </div>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-foreground" />
            Quantities are still an estimate: reservation and on-order allocation are not scoped to
            a specific project, and issued quantities are not deducted from gross demand.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {mrpQuery.isLoading ? (
            <LoadingLine label="Calculating estimated MRP..." />
          ) : mrpQuery.isError ? (
            <QueryError
              message={mrpQuery.error instanceof Error ? mrpQuery.error.message : undefined}
              onRetry={() => mrpQuery.refetch()}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">On hand</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">On order</TableHead>
                  <TableHead className="text-right">To buy</TableHead>
                  <TableHead>Need date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mrp.length === 0 && <EmptyRow columns={8} label="No MRP requirements" />}
                {mrp.map((item) => {
                  const unit = item.unit || unitByMaterial.get(item.materialId) || "";
                  return (
                    <TableRow key={item.materialId}>
                      <TableCell className="font-medium">{item.materialName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.totalGrossRequired.toLocaleString()} {unit}
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
