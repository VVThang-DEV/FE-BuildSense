import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Warehouse } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { useSession } from "@/lib/session";
import { warehousesApi, type InventoryAdjustmentReason } from "@/api/warehouses";
import { usersApi } from "@/api/users";
import { materialsApi } from "@/api/materials";
import { materialRequestsApi } from "@/api/materialRequests";
import { requireApiResult } from "@/api/client";
import { useWorkflowSuggestion } from "@/hooks/use-workflow-suggestion";
import { Textarea } from "@/components/ui/textarea";
import { WarehouseInventoryWorkspace } from "@/components/warehouse-inventory-workspace";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/app/admin/warehouses")({
  head: () => ({ meta: [{ title: "Warehouses — BuildSense AI" }] }),
  component: WarehousesPage,
});

function WarehousesPage() {
  const session = useSession();
  const suggestNext = useWorkflowSuggestion();
  const isLive = !!session?.token;
  const canCreateWarehouse = session?.role === "ADMIN";
  const canAdjustInventory = session?.role === "WAREHOUSE_MANAGER";

  const {
    data: warehouses,
    refetch,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () =>
      requireApiResult(await warehousesApi.getAll(), "Could not load warehouses") ?? [],
    enabled: isLive,
    staleTime: 30_000,
  });

  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ managerId: "", warehouseName: "", location: "" });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustment, setAdjustment] = useState<{
    variantId: string;
    quantityDelta: string;
    reasonCode: InventoryAdjustmentReason;
    note: string;
  }>({
    variantId: "",
    quantityDelta: "",
    reasonCode: "CYCLE_COUNT",
    note: "",
  });
  const [returning, setReturning] = useState(false);
  const [inventoryReturn, setInventoryReturn] = useState<{
    variantId: string;
    quantity: string;
    materialRequestId: string;
    reasonCode: "UNUSED" | "EXCESS_ISSUE" | "DAMAGED";
    condition: "USABLE" | "QUARANTINED";
    note: string;
  }>({
    variantId: "",
    quantity: "",
    materialRequestId: "",
    reasonCode: "UNUSED",
    condition: "USABLE",
    note: "",
  });

  const managersQuery = useQuery({
    queryKey: ["users", "warehouse-managers"],
    queryFn: async () =>
      (requireApiResult(await usersApi.getAll(), "Could not load warehouse managers") ?? []).filter(
        (account) => account.role === "WAREHOUSE_MANAGER",
      ),
    enabled: isLive && canCreateWarehouse && creating,
    staleTime: 30_000,
  });

  const { data: inventory, refetch: refetchInventory } = useQuery({
    queryKey: ["warehouse-inventory", selectedId],
    queryFn: async () => {
      const r = await warehousesApi.getInventory(selectedId!);
      return requireApiResult(r, "Could not load warehouse inventory") ?? [];
    },
    enabled: selectedId !== null,
    staleTime: 10_000,
  });

  const materialsQuery = useQuery({
    queryKey: ["materials", "warehouse-adjustment"],
    queryFn: async () =>
      requireApiResult(await materialsApi.getAll(), "Could not load material variants") ?? [],
    enabled: isLive && canAdjustInventory && adjusting,
    staleTime: 30_000,
  });
  const variants = (materialsQuery.data ?? []).flatMap((material) =>
    material.variants
      .filter((variant) => variant.isActive)
      .map((variant) => ({
        ...variant,
        label: `${material.materialName} - ${variant.variantName}`,
      })),
  );

  const transactionsQuery = useQuery({
    queryKey: ["warehouse-transactions", selectedId],
    queryFn: async () =>
      requireApiResult(
        await warehousesApi.getTransactions(selectedId!),
        "Could not load inventory transactions",
      ) ?? [],
    enabled: selectedId !== null,
    staleTime: 10_000,
  });

  const returnRequestsQuery = useQuery({
    queryKey: ["material-requests", "return-eligible", selectedId],
    queryFn: async () =>
      requireApiResult(
        await materialRequestsApi.getAll(),
        "Could not load issued material requests",
      ) ?? [],
    enabled: isLive && canAdjustInventory && returning && selectedId !== null,
    staleTime: 10_000,
  });
  const eligibleReturnRequests = (returnRequestsQuery.data ?? []).filter(
    (request) =>
      (request.status === "ISSUED" || request.status === "PARTIALLY_ISSUED") &&
      request.warehouseId === selectedId,
  );
  const selectedReturnRequest = eligibleReturnRequests.find(
    (request) => request.requestId === Number(inventoryReturn.materialRequestId),
  );
  const returnableItems = (selectedReturnRequest?.items ?? []).filter(
    (item) => item.issuedQuantity - item.returnedQuantity > 0,
  );
  const selectedReturnItem = returnableItems.find(
    (item) => item.variantId === Number(inventoryReturn.variantId),
  );
  const selectedReturnInventory = inventory?.find(
    (item) => item.variantId === Number(inventoryReturn.variantId),
  );
  const remainingReturnable = selectedReturnItem
    ? Math.max(0, selectedReturnItem.issuedQuantity - selectedReturnItem.returnedQuantity)
    : 0;
  const returnQuantity = Number(inventoryReturn.quantity);
  const returnExceedsIssued =
    !!selectedReturnItem && Number.isFinite(returnQuantity) && returnQuantity > remainingReturnable;
  const projectedReturnStock =
    (selectedReturnInventory?.quantity ?? 0) +
    (Number.isFinite(returnQuantity) ? returnQuantity : 0);
  const projectedReturnAvailable =
    (selectedReturnInventory?.availableQuantity ?? 0) +
    (inventoryReturn.condition === "USABLE" && Number.isFinite(returnQuantity)
      ? returnQuantity
      : 0);
  const selectedAdjustmentInventory = inventory?.find(
    (item) => item.variantId === Number(adjustment.variantId),
  );
  const adjustmentDelta = Number(adjustment.quantityDelta);
  const adjustmentBefore = selectedAdjustmentInventory?.quantity ?? 0;
  const adjustmentMinimum =
    (selectedAdjustmentInventory?.reservedQuantity ?? 0) +
    (selectedAdjustmentInventory?.quarantineQuantity ?? 0);
  const adjustmentAfter =
    adjustmentBefore + (Number.isFinite(adjustmentDelta) ? adjustmentDelta : 0);
  const adjustmentBreaksStockRule =
    !!adjustment.variantId &&
    Number.isFinite(adjustmentDelta) &&
    adjustmentDelta !== 0 &&
    adjustmentAfter < adjustmentMinimum;

  const submitCreate = async () => {
    if (!form.warehouseName.trim() || !form.location.trim() || !form.managerId) {
      toast.error("Warehouse name, location, and manager are required");
      return;
    }
    setSaving(true);
    try {
      const r = await warehousesApi.create({
        managerId: Number(form.managerId),
        warehouseName: form.warehouseName.trim(),
        location: form.location.trim(),
      });
      if (r.isSuccess) {
        suggestNext({
          message: "Warehouse created",
          nextStep:
            "The assigned Warehouse Manager can add opening stock using an approved inventory adjustment.",
          to: "/app/admin/warehouses",
          actionLabel: "Open warehouses",
        });
        setCreating(false);
        setForm({ managerId: "", warehouseName: "", location: "" });
        refetch();
      } else toast.error(r.errorMessage ?? "Create failed");
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setSaving(false);
    }
  };

  const submitAdjustment = async () => {
    const variantId = Number(adjustment.variantId);
    const quantityDelta = Number(adjustment.quantityDelta);
    if (!selectedId || !variantId || !Number.isFinite(quantityDelta) || quantityDelta === 0) {
      toast.error("Select a variant and enter a non-zero quantity change");
      return;
    }
    const current = inventory?.find((item) => item.variantId === variantId);
    const minimum = (current?.reservedQuantity ?? 0) + (current?.quarantineQuantity ?? 0);
    const after = (current?.quantity ?? 0) + quantityDelta;
    if (after < minimum) {
      toast.error(`Stock cannot be reduced below ${minimum} reserved and quarantined units`);
      return;
    }
    setSaving(true);
    try {
      const response = await warehousesApi.adjustInventory({
        warehouseId: selectedId,
        variantId,
        quantityDelta,
        reasonCode: adjustment.reasonCode,
        note: adjustment.note.trim() || undefined,
        rowVersion: current?.rowVersion,
      });
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Inventory adjustment failed", {
          description:
            "Next: reload the warehouse balance and keep the result above reserved plus quarantined stock.",
          action: { label: "Reload", onClick: () => refetchInventory() },
        });
        return;
      }
      suggestNext({
        message: "Inventory adjustment submitted",
        nextStep: "An Admin must approve it before the warehouse balance changes.",
        to: "/app/inventory-governance",
        actionLabel: "Track approval",
      });
      setAdjusting(false);
      setAdjustment({ variantId: "", quantityDelta: "", reasonCode: "CYCLE_COUNT", note: "" });
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setSaving(false);
    }
  };

  const submitReturn = async () => {
    const variantId = Number(inventoryReturn.variantId);
    const quantity = Number(inventoryReturn.quantity);
    const materialRequestId = Number(inventoryReturn.materialRequestId);
    if (!selectedId || !variantId || !Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Select a variant and enter a return quantity greater than 0");
      return;
    }
    if (!Number.isInteger(materialRequestId) || materialRequestId <= 0) {
      toast.error("Select an issued material request");
      return;
    }
    const requestItem = selectedReturnRequest?.items.find((item) => item.variantId === variantId);
    const maximumReturn = requestItem
      ? Math.max(0, requestItem.issuedQuantity - requestItem.returnedQuantity)
      : 0;
    if (!requestItem || quantity > maximumReturn) {
      toast.error(`Only ${maximumReturn} units remain returnable for this issued material`);
      return;
    }
    const current = inventory?.find((item) => item.variantId === variantId);
    setSaving(true);
    try {
      const response = await warehousesApi.returnInventory({
        warehouseId: selectedId,
        variantId,
        quantity,
        materialRequestId,
        reasonCode: inventoryReturn.reasonCode,
        condition: inventoryReturn.condition,
        note: inventoryReturn.note.trim() || undefined,
        rowVersion: current?.rowVersion,
      });
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Inventory return failed", {
          description:
            "Next: reload issued quantities and return only the remaining unreturned amount.",
          action: {
            label: "Reload",
            onClick: () => Promise.all([refetchInventory(), returnRequestsQuery.refetch()]),
          },
        });
        return;
      }
      suggestNext({
        message: "Inventory return recorded",
        nextStep: "Review the warehouse balance and transaction history for the returned stock.",
        to: "/app/admin/warehouses",
        actionLabel: "View inventory",
      });
      setReturning(false);
      setInventoryReturn({
        variantId: "",
        quantity: "",
        materialRequestId: "",
        reasonCode: "UNUSED",
        condition: "USABLE",
        note: "",
      });
      await Promise.all([refetchInventory(), transactionsQuery.refetch()]);
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Inventory"
        title="Warehouse Inventory"
        description="Monitor current stock, availability, reservations, replenishment, and inventory movement by warehouse."
        actions={
          isLive && canCreateWarehouse ? (
            <Button size="sm" className="h-8 text-xs" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New warehouse
            </Button>
          ) : undefined
        }
      />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Warehouse</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="warehouse-name">Name</Label>
              <Input
                id="warehouse-name"
                value={form.warehouseName}
                onChange={(e) => setForm((f) => ({ ...f, warehouseName: e.target.value }))}
                maxLength={250}
                placeholder="Main Site Warehouse"
                disabled={saving}
              />
            </div>
            <div>
              <Label>Warehouse manager</Label>
              <Select
                value={form.managerId}
                onValueChange={(managerId) => setForm((current) => ({ ...current, managerId }))}
                disabled={saving || managersQuery.isLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={managersQuery.isLoading ? "Loading managers..." : "Select manager"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(managersQuery.data ?? []).map((manager) => (
                    <SelectItem key={manager.id} value={String(manager.id)}>
                      {manager.firstName} {manager.lastName} ({manager.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {managersQuery.isSuccess && managersQuery.data.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Create a warehouse-manager account before creating a warehouse.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="warehouse-location">Location</Label>
              <Input
                id="warehouse-location"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                maxLength={500}
                placeholder="Block A, Ground Floor"
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={saving}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjusting} onOpenChange={setAdjusting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust warehouse inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Material variant</Label>
              <Select
                value={adjustment.variantId}
                onValueChange={(variantId) =>
                  setAdjustment((current) => ({ ...current, variantId }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select material variant" />
                </SelectTrigger>
                <SelectContent>
                  {variants.map((variant) => (
                    <SelectItem key={variant.variantId} value={String(variant.variantId)}>
                      {variant.label} ({variant.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity-delta">Quantity change</Label>
              <Input
                id="quantity-delta"
                type="number"
                step="0.01"
                value={adjustment.quantityDelta}
                onChange={(event) =>
                  setAdjustment((current) => ({
                    ...current,
                    quantityDelta: event.target.value,
                  }))
                }
                placeholder="Use a negative value to remove stock"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Positive values add stock; negative values remove stock. This does not create a
                warehouse transfer.
              </p>
            </div>
            {!!adjustment.variantId && (
              <div
                className={`grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm sm:grid-cols-4 ${adjustmentBreaksStockRule ? "border-destructive/50 bg-destructive/5" : "bg-muted/30"}`}
              >
                <div>
                  <p className="text-xs text-muted-foreground">Current stock</p>
                  <p className="font-medium tabular-nums">{adjustmentBefore}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reserved</p>
                  <p className="font-medium tabular-nums">
                    {selectedAdjustmentInventory?.reservedQuantity ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quarantine</p>
                  <p className="font-medium tabular-nums">
                    {selectedAdjustmentInventory?.quarantineQuantity ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">After approval</p>
                  <p
                    className={`font-medium tabular-nums ${adjustmentBreaksStockRule ? "text-destructive" : ""}`}
                  >
                    {adjustmentAfter}
                  </p>
                </div>
                {adjustmentBreaksStockRule && (
                  <p className="col-span-full text-xs text-destructive">
                    The result cannot be lower than {adjustmentMinimum}, because reserved and
                    quarantined stock cannot be removed.
                  </p>
                )}
              </div>
            )}
            <div>
              <Label>Reason code</Label>
              <Select
                value={adjustment.reasonCode}
                onValueChange={(reasonCode) =>
                  setAdjustment((current) => ({
                    ...current,
                    reasonCode: reasonCode as typeof current.reasonCode,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CYCLE_COUNT">Cycle count</SelectItem>
                  <SelectItem value="DAMAGE">Damage</SelectItem>
                  <SelectItem value="LOSS">Loss</SelectItem>
                  <SelectItem value="DATA_CORRECTION">Data correction</SelectItem>
                  <SelectItem value="OPENING_BALANCE">Opening balance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="adjustment-note">Reason</Label>
              <Textarea
                id="adjustment-note"
                value={adjustment.note}
                onChange={(event) =>
                  setAdjustment((current) => ({ ...current, note: event.target.value }))
                }
                maxLength={1000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjusting(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitAdjustment} disabled={saving || adjustmentBreaksStockRule}>
              {saving ? "Submitting..." : "Submit for approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returning} onOpenChange={setReturning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record inventory return</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Issued material request</Label>
              <Select
                value={inventoryReturn.materialRequestId}
                onValueChange={(materialRequestId) =>
                  setInventoryReturn((current) => ({
                    ...current,
                    materialRequestId,
                    variantId: "",
                  }))
                }
                disabled={returnRequestsQuery.isLoading || returnRequestsQuery.isError}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      returnRequestsQuery.isLoading
                        ? "Loading issued requests..."
                        : "Select issued request"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {eligibleReturnRequests.map((request) => (
                    <SelectItem key={request.requestId} value={String(request.requestId)}>
                      Request #{request.requestId} · Project #{request.projectId} ·{" "}
                      {new Date(request.requestDate).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {returnRequestsQuery.isError ? (
                <p className="mt-1 text-xs text-destructive">
                  {returnRequestsQuery.error instanceof Error
                    ? returnRequestsQuery.error.message
                    : "Could not load issued material requests"}
                </p>
              ) : returnRequestsQuery.isSuccess && eligibleReturnRequests.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  This warehouse has no issued material requests eligible for return.
                </p>
              ) : null}
            </div>
            <div>
              <Label>Issued material</Label>
              <Select
                value={inventoryReturn.variantId}
                onValueChange={(variantId) =>
                  setInventoryReturn((current) => ({ ...current, variantId }))
                }
                disabled={!selectedReturnRequest}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select returned material" />
                </SelectTrigger>
                <SelectContent>
                  {returnableItems.map((item) => (
                    <SelectItem key={item.itemId} value={String(item.variantId)}>
                      {item.materialName} — {item.variantName} · returnable{" "}
                      {Math.max(0, item.issuedQuantity - item.returnedQuantity)}{" "}
                      {item.unit ?? "units"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="return-quantity">Returned quantity</Label>
              <Input
                id="return-quantity"
                type="number"
                min="0.01"
                max={remainingReturnable || undefined}
                step="0.01"
                value={inventoryReturn.quantity}
                onChange={(event) =>
                  setInventoryReturn((current) => ({
                    ...current,
                    quantity: event.target.value,
                  }))
                }
              />
            </div>
            {selectedReturnItem && (
              <div
                className={`grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm sm:grid-cols-4 ${returnExceedsIssued ? "border-destructive/50 bg-destructive/5" : "bg-muted/30"}`}
              >
                <div>
                  <p className="text-xs text-muted-foreground">Remaining returnable</p>
                  <p className="font-medium tabular-nums">{remainingReturnable}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current stock</p>
                  <p className="font-medium tabular-nums">
                    {selectedReturnInventory?.quantity ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stock after return</p>
                  <p className="font-medium tabular-nums">{projectedReturnStock}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Available after return</p>
                  <p className="font-medium tabular-nums">{projectedReturnAvailable}</p>
                </div>
                {inventoryReturn.condition === "QUARANTINED" && (
                  <p className="col-span-full text-xs text-muted-foreground">
                    Quarantined returns increase on-hand stock but do not increase available stock.
                  </p>
                )}
                {returnExceedsIssued && (
                  <p className="col-span-full text-xs text-destructive">
                    Reduce the returned quantity to {remainingReturnable} or less.
                  </p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Return reason</Label>
                <Select
                  value={inventoryReturn.reasonCode}
                  onValueChange={(reasonCode) =>
                    setInventoryReturn((current) => ({
                      ...current,
                      reasonCode: reasonCode as typeof current.reasonCode,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNUSED">Unused</SelectItem>
                    <SelectItem value="EXCESS_ISSUE">Excess issue</SelectItem>
                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condition</Label>
                <Select
                  value={inventoryReturn.condition}
                  onValueChange={(condition) =>
                    setInventoryReturn((current) => ({
                      ...current,
                      condition: condition as typeof current.condition,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USABLE">Usable</SelectItem>
                    <SelectItem value="QUARANTINED">Quarantined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="return-note">Return note</Label>
              <Textarea
                id="return-note"
                value={inventoryReturn.note}
                onChange={(event) =>
                  setInventoryReturn((current) => ({ ...current, note: event.target.value }))
                }
                maxLength={1000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturning(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitReturn} disabled={saving || returnExceedsIssued}>
              {saving ? "Recording..." : "Record return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isLive ? (
        <Card className="shadow-sm">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Sign in with a backend account to view warehouse inventory.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card className="shadow-sm">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Loading warehouses...
          </CardContent>
        </Card>
      ) : isError ? (
        <Card className="shadow-sm">
          <QueryError
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        </Card>
      ) : (warehouses ?? []).length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center p-10 text-center">
            <Warehouse className="mb-3 h-9 w-9 text-muted-foreground" />
            <p className="font-medium">No warehouses configured</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a warehouse and assign a Warehouse Manager to begin tracking stock.
            </p>
            {canCreateWarehouse && (
              <Button className="mt-4" onClick={() => setCreating(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> New warehouse
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <WarehouseInventoryWorkspace
          warehouses={warehouses ?? []}
          selectedId={selectedId}
          onSelectWarehouse={setSelectedId}
          canAdjustInventory={canAdjustInventory}
          onAdjust={() => setAdjusting(true)}
          onReturn={() => setReturning(true)}
        />
      )}
    </div>
  );
}
