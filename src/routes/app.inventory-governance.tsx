import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { warehousesApi, type PhysicalCountResponse } from "@/api/warehouses";
import { requireApiResult } from "@/api/client";
import { useSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/app/inventory-governance")({
  head: () => ({ meta: [{ title: "Inventory Governance - BuildSense AI" }] }),
  component: InventoryGovernancePage,
});

function InventoryGovernancePage() {
  const session = useSession();
  const isAdmin = session?.role === "ADMIN";
  const isManager = session?.role === "WAREHOUSE_MANAGER";
  const [warehouseId, setWarehouseId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [countValues, setCountValues] = useState<Record<number, string>>({});

  const warehousesQuery = useQuery({
    queryKey: ["warehouses", "governance"],
    queryFn: async () =>
      requireApiResult(await warehousesApi.getAll(), "Could not load warehouses") ?? [],
    enabled: !!session?.token,
  });
  const inventoryQuery = useQuery({
    queryKey: ["warehouse-inventory", "count", warehouseId],
    queryFn: async () =>
      requireApiResult(
        await warehousesApi.getInventory(Number(warehouseId)),
        "Could not load inventory",
      ) ?? [],
    enabled: !!warehouseId && isManager,
  });
  const adjustmentsQuery = useQuery({
    queryKey: ["inventory-adjustments"],
    queryFn: async () =>
      requireApiResult(await warehousesApi.getAdjustments(), "Could not load adjustments") ?? [],
    enabled: !!session?.token,
  });
  const countsQuery = useQuery({
    queryKey: ["physical-counts"],
    queryFn: async () =>
      requireApiResult(await warehousesApi.getPhysicalCounts(), "Could not load physical counts") ??
      [],
    enabled: !!session?.token,
  });

  const reviewAdjustment = async (adjustmentId: number, rowVersion: string, approve: boolean) => {
    const reviewNote = window.prompt(`Optional ${approve ? "approval" : "rejection"} note`);
    if (reviewNote === null) return;
    setBusy(`adjustment-${adjustmentId}`);
    try {
      const response = await warehousesApi.reviewAdjustment(
        adjustmentId,
        approve,
        rowVersion,
        reviewNote || undefined,
      );
      if (!response.isSuccess) toast.error(response.errorMessage ?? "Review failed");
      else {
        toast.success(`Adjustment ${approve ? "approved" : "rejected"}`);
        await adjustmentsQuery.refetch();
      }
    } finally {
      setBusy(null);
    }
  };

  const startCount = async () => {
    const variantIds = (inventoryQuery.data ?? []).map((item) => item.variantId);
    if (!warehouseId || variantIds.length === 0) {
      toast.error("Select a warehouse with inventory to count");
      return;
    }
    setBusy("start-count");
    try {
      const response = await warehousesApi.startPhysicalCount(Number(warehouseId), variantIds);
      if (!response.isSuccess) toast.error(response.errorMessage ?? "Could not start count");
      else {
        toast.success("Physical count started");
        await countsQuery.refetch();
      }
    } finally {
      setBusy(null);
    }
  };

  const submitCount = async (count: PhysicalCountResponse) => {
    const lines = count.lines.map((line) => ({
      lineId: line.lineId,
      actualQuantity: Number(countValues[line.lineId] ?? line.expectedQuantity),
    }));
    if (lines.some((line) => !Number.isFinite(line.actualQuantity) || line.actualQuantity < 0)) {
      toast.error("Every counted quantity must be zero or greater");
      return;
    }
    setBusy(`count-${count.sessionId}`);
    try {
      const response = await warehousesApi.submitPhysicalCount(
        count.sessionId,
        count.rowVersion,
        lines,
      );
      if (!response.isSuccess) toast.error(response.errorMessage ?? "Could not submit count");
      else {
        toast.success("Physical count submitted for approval");
        await countsQuery.refetch();
      }
    } finally {
      setBusy(null);
    }
  };

  const reviewCount = async (count: PhysicalCountResponse, approve: boolean) => {
    const reviewNote = window.prompt(`Optional ${approve ? "approval" : "rejection"} note`);
    if (reviewNote === null) return;
    setBusy(`count-${count.sessionId}`);
    try {
      const response = await warehousesApi.reviewPhysicalCount(
        count.sessionId,
        approve,
        count.rowVersion,
        reviewNote || undefined,
      );
      if (!response.isSuccess) toast.error(response.errorMessage ?? "Count review failed");
      else {
        toast.success(`Physical count ${approve ? "approved" : "rejected"}`);
        await countsQuery.refetch();
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        section="Operations"
        title="Inventory Governance"
        description="Review stock adjustments and reconcile physical warehouse counts."
      />
      <Tabs defaultValue="adjustments">
        <TabsList>
          <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
          <TabsTrigger value="counts">Physical counts</TabsTrigger>
        </TabsList>
        <TabsContent value="adjustments">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inventory adjustments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(adjustmentsQuery.data ?? []).map((item) => (
                    <TableRow key={item.adjustmentId}>
                      <TableCell>#{item.adjustmentId}</TableCell>
                      <TableCell>#{item.warehouseId}</TableCell>
                      <TableCell>#{item.variantId}</TableCell>
                      <TableCell>{item.quantityDelta}</TableCell>
                      <TableCell>{item.reasonCode}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin && item.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!!busy}
                              onClick={() =>
                                reviewAdjustment(item.adjustmentId, item.rowVersion, true)
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              disabled={!!busy}
                              onClick={() =>
                                reviewAdjustment(item.adjustmentId, item.rowVersion, false)
                              }
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="counts" className="space-y-4">
          {isManager && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Start a count</CardTitle>
              </CardHeader>
              <CardContent className="flex items-end gap-3">
                <div className="flex-1">
                  <Label>Managed warehouse</Label>
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {(warehousesQuery.data ?? []).map((warehouse) => (
                        <SelectItem
                          key={warehouse.warehouseId}
                          value={String(warehouse.warehouseId)}
                        >
                          {warehouse.warehouseName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  disabled={busy === "start-count" || inventoryQuery.isLoading}
                  onClick={startCount}
                >
                  Start full count
                </Button>
              </CardContent>
            </Card>
          )}
          {(countsQuery.data ?? []).map((count) => (
            <Card key={count.sessionId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Count #{count.sessionId} - Warehouse #{count.warehouseId}
                  </CardTitle>
                  <Badge variant="outline">{count.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variant</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Variance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {count.lines.map((line) => (
                      <TableRow key={line.lineId}>
                        <TableCell>#{line.variantId}</TableCell>
                        <TableCell>{line.expectedQuantity}</TableCell>
                        <TableCell>
                          {count.status === "DRAFT" && isManager ? (
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={countValues[line.lineId] ?? String(line.expectedQuantity)}
                              onChange={(event) =>
                                setCountValues((current) => ({
                                  ...current,
                                  [line.lineId]: event.target.value,
                                }))
                              }
                            />
                          ) : (
                            (line.actualQuantity ?? "-")
                          )}
                        </TableCell>
                        <TableCell>{line.varianceQuantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end gap-2">
                  {isManager && count.status === "DRAFT" && (
                    <Button disabled={!!busy} onClick={() => submitCount(count)}>
                      Submit count
                    </Button>
                  )}
                  {isAdmin && count.status === "PENDING_APPROVAL" && (
                    <>
                      <Button disabled={!!busy} onClick={() => reviewCount(count, true)}>
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={!!busy}
                        onClick={() => reviewCount(count, false)}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
