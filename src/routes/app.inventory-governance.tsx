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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useWorkflowSuggestion } from "@/hooks/use-workflow-suggestion";

type ReviewTarget =
  | {
      kind: "adjustment";
      id: number;
      rowVersion: string;
      approve: boolean;
      note: string;
    }
  | {
      kind: "count";
      count: PhysicalCountResponse;
      approve: boolean;
      note: string;
    };

export const Route = createFileRoute("/app/inventory-governance")({
  head: () => ({ meta: [{ title: "Inventory Governance - BuildSense AI" }] }),
  component: InventoryGovernancePage,
});

function InventoryGovernancePage() {
  const session = useSession();
  const suggestNext = useWorkflowSuggestion();
  const isManager = session?.role === "WAREHOUSE_MANAGER";
  const [busy, setBusy] = useState<string | null>(null);
  const [countValues, setCountValues] = useState<Record<number, string>>({});
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);

  const warehousesQuery = useQuery({
    queryKey: ["warehouses", "governance"],
    queryFn: async () =>
      requireApiResult(await warehousesApi.getAll(), "Could not load warehouses") ?? [],
    enabled: !!session?.token,
  });
  const activeWarehouse =
    (warehousesQuery.data ?? []).find((w) => w.isActive) ?? warehousesQuery.data?.[0];
  const activeWarehouseId = activeWarehouse ? String(activeWarehouse.warehouseId) : "";
  const inventoryQuery = useQuery({
    queryKey: ["warehouse-inventory", "count", activeWarehouseId],
    queryFn: async () =>
      requireApiResult(
        await warehousesApi.getInventory(Number(activeWarehouseId)),
        "Could not load inventory",
      ) ?? [],
    enabled: !!activeWarehouseId && isManager,
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
  const openCountWarehouseIds = Array.from(
    new Set(
      (countsQuery.data ?? [])
        .filter((count) => count.status === "DRAFT" || count.status === "PENDING_APPROVAL")
        .map((count) => count.warehouseId),
    ),
  );
  const countInventoriesQuery = useQuery({
    queryKey: ["physical-count-inventories", openCountWarehouseIds.join(",")],
    queryFn: async () => {
      const rows = await Promise.all(
        openCountWarehouseIds.map(async (currentWarehouseId) => {
          const inventory =
            requireApiResult(
              await warehousesApi.getInventory(currentWarehouseId),
              `Could not load inventory for warehouse #${currentWarehouseId}`,
            ) ?? [];
          return inventory.map((item) => ({ ...item, warehouseId: currentWarehouseId }));
        }),
      );
      return rows.flat();
    },
    enabled: !!session?.token && openCountWarehouseIds.length > 0,
    staleTime: 5_000,
  });

  const inventoryForCountLine = (warehouse: number, variant: number) =>
    countInventoriesQuery.data?.find(
      (item) => item.warehouseId === warehouse && item.variantId === variant,
    );

  const countHasStockViolation = (count: PhysicalCountResponse) =>
    count.lines.some((line) => {
      const inventoryItem = inventoryForCountLine(count.warehouseId, line.variantId);
      const actual = Number(
        countValues[line.lineId] ?? line.actualQuantity ?? line.expectedQuantity,
      );
      if (countInventoriesQuery.isLoading || countInventoriesQuery.isError) return false;
      return (
        !inventoryItem ||
        !Number.isFinite(actual) ||
        actual < inventoryItem.reservedQuantity + inventoryItem.quarantineQuantity
      );
    });

  const submitReview = async () => {
    if (!reviewTarget) return;
    const target = reviewTarget;
    if (
      target.kind === "count" &&
      target.approve &&
      (countInventoriesQuery.isLoading || countInventoriesQuery.isError)
    ) {
      toast.error("Reload current warehouse stock before approving this physical count");
      return;
    }
    if (target.kind === "count" && target.approve && countHasStockViolation(target.count)) {
      toast.error("A counted quantity is below reserved and quarantined stock");
      return;
    }
    const targetId = target.kind === "adjustment" ? target.id : target.count.sessionId;
    setBusy(`${target.kind}-${targetId}`);
    try {
      const response =
        target.kind === "adjustment"
          ? await warehousesApi.reviewAdjustment(
              target.id,
              target.approve,
              target.rowVersion,
              target.note.trim() || undefined,
            )
          : await warehousesApi.reviewPhysicalCount(
              target.count.sessionId,
              target.approve,
              target.count.rowVersion,
              target.note.trim() || undefined,
            );
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Review failed");
      } else {
        suggestNext({
          message: `${target.kind === "adjustment" ? "Adjustment" : "Physical count"} ${target.approve ? "approved" : "rejected"}`,
          nextStep: target.approve
            ? "Verify the resulting warehouse balance and inventory transaction."
            : "Review the remaining governance queue.",
          to: target.approve ? "/app/admin/warehouses" : "/app/inventory-governance",
          actionLabel: target.approve ? "View inventory" : "Continue reviews",
        });
        if (target.kind === "adjustment") await adjustmentsQuery.refetch();
        else await countsQuery.refetch();
        setReviewTarget(null);
      }
    } finally {
      setBusy(null);
    }
  };

  const startCount = async () => {
    const variantIds = (inventoryQuery.data ?? []).map((item) => item.variantId);
    if (!activeWarehouseId || variantIds.length === 0) {
      toast.error("The active warehouse has no inventory to count");
      return;
    }
    setBusy("start-count");
    try {
      const response = await warehousesApi.startPhysicalCount(variantIds);
      if (!response.isSuccess) toast.error(response.errorMessage ?? "Could not start count");
      else {
        suggestNext({
          message: "Physical count started",
          nextStep: "Enter the actual quantity for every count line, then submit it for approval.",
          to: "/app/inventory-governance",
          actionLabel: "Enter count",
        });
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
    if (countInventoriesQuery.isLoading || countInventoriesQuery.isError) {
      toast.error("Reload current warehouse stock before submitting this count");
      return;
    }
    if (countHasStockViolation(count)) {
      toast.error("Actual quantity cannot be below reserved and quarantined stock");
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
        suggestNext({
          message: "Physical count submitted for approval",
          nextStep: "A Warehouse Manager must approve the variance before stock changes.",
          to: "/app/inventory-governance",
          actionLabel: "Track approval",
        });
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
                        {isManager && item.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!!busy}
                              onClick={() =>
                                setReviewTarget({
                                  kind: "adjustment",
                                  id: item.adjustmentId,
                                  rowVersion: item.rowVersion,
                                  approve: true,
                                  note: "",
                                })
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
                                setReviewTarget({
                                  kind: "adjustment",
                                  id: item.adjustmentId,
                                  rowVersion: item.rowVersion,
                                  approve: false,
                                  note: "",
                                })
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
                  <Label>Active warehouse</Label>
                  <p className="text-sm font-medium">
                    {activeWarehouse
                      ? `${activeWarehouse.warehouseName} · ${activeWarehouse.location}`
                      : "No active warehouse"}
                  </p>
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
                      <TableHead>Reserved / quarantine</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Available after count</TableHead>
                      <TableHead>Variance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {count.lines.map((line) => {
                      const inventoryItem = inventoryForCountLine(
                        count.warehouseId,
                        line.variantId,
                      );
                      const minimum =
                        (inventoryItem?.reservedQuantity ?? 0) +
                        (inventoryItem?.quarantineQuantity ?? 0);
                      const actual = Number(
                        countValues[line.lineId] ?? line.actualQuantity ?? line.expectedQuantity,
                      );
                      const violatesMinimum =
                        (!countInventoriesQuery.isLoading &&
                          !countInventoriesQuery.isError &&
                          !inventoryItem) ||
                        (Number.isFinite(actual) && actual < minimum);
                      return (
                        <TableRow
                          key={line.lineId}
                          className={violatesMinimum ? "bg-destructive/5" : ""}
                        >
                          <TableCell>#{line.variantId}</TableCell>
                          <TableCell>{line.expectedQuantity}</TableCell>
                          <TableCell>
                            {inventoryItem?.reservedQuantity ?? 0} /{" "}
                            {inventoryItem?.quarantineQuantity ?? 0}
                          </TableCell>
                          <TableCell>
                            {count.status === "DRAFT" && isManager ? (
                              <Input
                                type="number"
                                min={minimum}
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
                          <TableCell
                            className={violatesMinimum ? "text-destructive" : "tabular-nums"}
                          >
                            {inventoryItem && Number.isFinite(actual) ? actual - minimum : "-"}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {count.status === "DRAFT" && Number.isFinite(actual)
                              ? actual - line.expectedQuantity
                              : line.varianceQuantity}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="flex justify-end gap-2">
                  {isManager && count.status === "DRAFT" && (
                    <Button
                      disabled={
                        !!busy ||
                        countInventoriesQuery.isLoading ||
                        countInventoriesQuery.isError ||
                        countHasStockViolation(count)
                      }
                      onClick={() => submitCount(count)}
                    >
                      Submit count
                    </Button>
                  )}
                  {isManager && count.status === "PENDING_APPROVAL" && (
                    <>
                      <Button
                        disabled={
                          !!busy ||
                          countInventoriesQuery.isLoading ||
                          countInventoriesQuery.isError ||
                          countHasStockViolation(count)
                        }
                        onClick={() =>
                          setReviewTarget({
                            kind: "count",
                            count,
                            approve: true,
                            note: "",
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={!!busy}
                        onClick={() =>
                          setReviewTarget({
                            kind: "count",
                            count,
                            approve: false,
                            note: "",
                          })
                        }
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </div>
                {countHasStockViolation(count) && (
                  <p className="text-xs text-destructive">
                    At least one actual quantity is below its reserved plus quarantined minimum.
                    Correct the count before submission or approval.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog
        open={reviewTarget !== null}
        onOpenChange={(open) => !open && !busy && setReviewTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewTarget?.approve ? "Approve" : "Reject"}{" "}
              {reviewTarget?.kind === "count" ? "physical count" : "inventory adjustment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="governance-review-note">Review note (optional)</Label>
            <Textarea
              id="governance-review-note"
              value={reviewTarget?.note ?? ""}
              onChange={(event) =>
                setReviewTarget((current) =>
                  current ? { ...current, note: event.target.value } : current,
                )
              }
              placeholder="Record the reason or any follow-up needed"
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={!!busy} onClick={() => setReviewTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={reviewTarget?.approve ? "default" : "destructive"}
              disabled={!!busy}
              onClick={submitReview}
            >
              {busy ? "Saving..." : reviewTarget?.approve ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
