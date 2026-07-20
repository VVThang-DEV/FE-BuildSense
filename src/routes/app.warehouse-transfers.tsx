import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, Eye, PackageOpen, Plus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { warehouseTransfersApi, type WarehouseTransferResponse } from "@/api/warehouseTransfers";
import { warehousesApi } from "@/api/warehouses";
import { requireApiResult } from "@/api/client";
import { useSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { useWorkflowSuggestion } from "@/hooks/use-workflow-suggestion";

export const Route = createFileRoute("/app/warehouse-transfers")({
  head: () => ({ meta: [{ title: "Warehouse Transfers - BuildSense AI" }] }),
  component: WarehouseTransfersPage,
});

function WarehouseTransfersPage() {
  const session = useSession();
  const suggestNext = useWorkflowSuggestion();
  const canCreate = session?.role === "WAREHOUSE_MANAGER";
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [selectedTransfer, setSelectedTransfer] = useState<WarehouseTransferResponse | null>(null);
  const [approvalTransfer, setApprovalTransfer] = useState<WarehouseTransferResponse | null>(null);
  const [shippingTransfer, setShippingTransfer] = useState<WarehouseTransferResponse | null>(null);
  const [receiptTransfer, setReceiptTransfer] = useState<WarehouseTransferResponse | null>(null);
  const [receiptValues, setReceiptValues] = useState<
    Record<number, { accepted: string; damaged: string; lost: string }>
  >({});

  const transfersQuery = useQuery({
    queryKey: ["warehouse-transfers"],
    queryFn: async () =>
      requireApiResult(
        await warehouseTransfersApi.getAll(),
        "Could not load warehouse transfers",
      ) ?? [],
    enabled: !!session?.token,
    staleTime: 10_000,
  });
  const warehousesQuery = useQuery({
    queryKey: ["warehouses", "transfer-scope"],
    queryFn: async () =>
      requireApiResult(await warehousesApi.getAll(), "Could not load managed warehouses") ?? [],
    enabled: !!session?.token,
  });
  const sourceInventoryQuery = useQuery({
    queryKey: ["warehouses", "transfer-source-inventory", sourceWarehouseId],
    queryFn: async () =>
      requireApiResult(
        await warehousesApi.getInventory(Number(sourceWarehouseId)),
        "Could not load source warehouse inventory",
      ) ?? [],
    enabled: !!session?.token && canCreate && creating && !!sourceWarehouseId,
  });
  const approvalInventoryQuery = useQuery({
    queryKey: ["warehouses", "transfer-approval-inventory", approvalTransfer?.sourceWarehouseId],
    queryFn: async () =>
      requireApiResult(
        await warehousesApi.getInventory(approvalTransfer!.sourceWarehouseId),
        "Could not load current source inventory",
      ) ?? [],
    enabled: !!session?.token && approvalTransfer !== null,
    staleTime: 5_000,
  });
  const shippingInventoryQuery = useQuery({
    queryKey: ["warehouses", "transfer-shipping-inventory", shippingTransfer?.sourceWarehouseId],
    queryFn: async () =>
      requireApiResult(
        await warehousesApi.getInventory(shippingTransfer!.sourceWarehouseId),
        "Could not load reserved source inventory",
      ) ?? [],
    enabled: !!session?.token && shippingTransfer !== null,
    staleTime: 5_000,
  });

  const managedWarehouseIds = new Set(
    (warehousesQuery.data ?? []).map((warehouse) => warehouse.warehouseId),
  );
  const destinationWarehouses = (warehousesQuery.data ?? []).filter(
    (warehouse) => String(warehouse.warehouseId) !== sourceWarehouseId,
  );
  const transferableInventory = (sourceInventoryQuery.data ?? [])
    .filter((item) => item.availableQuantity > 0)
    .sort((left, right) => {
      const leftLabel = `${left.material?.materialName ?? ""} ${left.variantName ?? ""}`;
      const rightLabel = `${right.material?.materialName ?? ""} ${right.variantName ?? ""}`;
      return leftLabel.localeCompare(rightLabel);
    });
  const selectedInventory = transferableInventory.find(
    (item) => item.variantId === Number(variantId),
  );
  const approvalHasShortage =
    approvalTransfer?.items.some((item) => {
      const inventoryItem = approvalInventoryQuery.data?.find(
        (record) => record.variantId === item.variantId,
      );
      return item.requestedQuantity > (inventoryItem?.availableQuantity ?? 0);
    }) ?? false;
  const shipmentHasUnavailableStock =
    shippingTransfer?.items.some((item) => {
      const inventoryItem = shippingInventoryQuery.data?.find(
        (record) => record.variantId === item.variantId,
      );
      return (
        !inventoryItem ||
        inventoryItem.reservedQuantity < item.requestedQuantity ||
        inventoryItem.quantity - inventoryItem.quarantineQuantity < item.requestedQuantity
      );
    }) ?? false;

  const resetCreate = () => {
    setSourceWarehouseId("");
    setDestinationWarehouseId("");
    setVariantId("");
    setQuantity("1");
    setNote("");
  };

  const createTransfer = async () => {
    const source = Number(sourceWarehouseId);
    const destination = Number(destinationWarehouseId);
    const amount = Number(quantity);
    if (!source || !destination || !variantId || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Source, destination, material variant, and a positive quantity are required");
      return;
    }
    if (source === destination) {
      toast.error("Source and destination warehouses must differ");
      return;
    }
    if (!managedWarehouseIds.has(source)) {
      toast.error("You can only transfer stock from a warehouse you manage");
      return;
    }
    if (!selectedInventory) {
      toast.error("Select an available material from the source warehouse");
      return;
    }
    if (amount > selectedInventory.availableQuantity) {
      toast.error(
        `Only ${selectedInventory.availableQuantity.toLocaleString()} ${selectedInventory.material?.unit ?? "units"} are available to transfer`,
      );
      return;
    }
    setBusy("create");
    try {
      const response = await warehouseTransfersApi.create({
        sourceWarehouseId: source,
        destinationWarehouseId: destination,
        note: note.trim() || undefined,
        items: [{ variantId: Number(variantId), quantity: amount }],
      });
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Could not create transfer");
        return;
      }
      suggestNext({
        message: `Transfer #${response.result.transferId} created`,
        nextStep: "A different manager or Admin must approve it before the source can ship stock.",
        to: "/app/dashboard",
        actionLabel: "View next actions",
      });
      setCreating(false);
      resetCreate();
      await transfersQuery.refetch();
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setBusy(null);
    }
  };

  const mutate = async (
    transfer: WarehouseTransferResponse,
    action: "approve" | "reject" | "ship" | "cancel",
  ) => {
    setBusy(`${action}-${transfer.transferId}`);
    try {
      const response =
        action === "approve"
          ? await warehouseTransfersApi.approve(transfer.transferId)
          : action === "reject"
            ? await warehouseTransfersApi.reject(transfer.transferId)
            : action === "ship"
              ? await warehouseTransfersApi.ship(transfer.transferId)
              : await warehouseTransfersApi.cancel(transfer.transferId);
      if (!response.isSuccess) {
        const message = response.errorMessage ?? `Could not ${action} transfer`;
        if (/inventory|stock|reservation/i.test(message)) {
          toast.error(message, {
            description:
              "Next: reload the source balance. Cancel and recreate a smaller transfer, or replenish the source warehouse.",
            action: { label: "Reload stock", onClick: () => approvalInventoryQuery.refetch() },
          });
        } else toast.error(message);
        return;
      }
      const nextStep =
        action === "approve"
          ? "The source Warehouse Manager can now ship the reserved stock."
          : action === "ship"
            ? "The destination Warehouse Manager should record received, damaged, and lost quantities."
            : "Review the remaining warehouse transfer queue.";
      suggestNext({
        message: `Transfer #${transfer.transferId} ${action}d`,
        nextStep,
        to: "/app/warehouse-transfers",
        actionLabel: "View transfers",
      });
      if (action === "approve") setApprovalTransfer(null);
      if (action === "ship") setShippingTransfer(null);
      await transfersQuery.refetch();
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setBusy(null);
    }
  };

  const openReceipt = (transfer: WarehouseTransferResponse) => {
    const initialValues = Object.fromEntries(
      transfer.items
        .map((item) => ({
          item,
          remaining:
            item.shippedQuantity - item.receivedQuantity - item.damagedQuantity - item.lostQuantity,
        }))
        .filter(({ remaining }) => remaining > 0)
        .map(({ item, remaining }) => [
          item.transferItemId,
          { accepted: String(remaining), damaged: "0", lost: "0" },
        ]),
    );
    if (Object.keys(initialValues).length === 0) {
      toast.error("This transfer has no remaining shipped quantity to receive");
      return;
    }
    setReceiptValues(initialValues);
    setReceiptTransfer(transfer);
  };

  const receiveTransfer = async () => {
    if (!receiptTransfer) return;
    const receiptItems = [];
    for (const item of receiptTransfer.items) {
      const values = receiptValues[item.transferItemId];
      if (!values) continue;
      const accepted = Number(values.accepted);
      const damaged = Number(values.damaged);
      const lost = Number(values.lost);
      const remaining =
        item.shippedQuantity - item.receivedQuantity - item.damagedQuantity - item.lostQuantity;
      if (
        [accepted, damaged, lost].some((value) => !Number.isFinite(value) || value < 0) ||
        accepted + damaged + lost > remaining
      ) {
        toast.error(`Receipt quantities for ${item.materialName} exceed the shipped remainder`);
        return;
      }
      if (accepted + damaged + lost > 0) {
        receiptItems.push({
          transferItemId: item.transferItemId,
          quantity: accepted,
          damagedQuantity: damaged,
          lostQuantity: lost,
        });
      }
    }
    if (receiptItems.length === 0) {
      toast.error("Enter at least one received, damaged, or lost quantity");
      return;
    }
    setBusy(`receive-${receiptTransfer.transferId}`);
    try {
      const response = await warehouseTransfersApi.receive(
        receiptTransfer.transferId,
        receiptItems,
      );
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Could not receive transfer");
        return;
      }
      suggestNext({
        message: `Transfer #${receiptTransfer.transferId} receipt recorded`,
        nextStep: "Verify the destination warehouse balance and any recorded variance.",
        to: "/app/admin/warehouses",
        actionLabel: "View inventory",
      });
      setReceiptTransfer(null);
      setReceiptValues({});
      await transfersQuery.refetch();
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setBusy(null);
    }
  };

  const transfers = transfersQuery.data ?? [];
  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        section="Operations"
        title="Warehouse Transfers"
        description="Reserve, ship, and receive stock between warehouses with an auditable state workflow."
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="mr-1 h-4 w-4" /> New transfer
            </Button>
          ) : undefined
        }
      />

      {transfersQuery.isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading transfers...</div>
      ) : transfersQuery.isError ? (
        <QueryError
          message={transfersQuery.error instanceof Error ? transfersQuery.error.message : undefined}
          onRetry={() => transfersQuery.refetch()}
        />
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No warehouse transfers
                    </TableCell>
                  </TableRow>
                )}
                {transfers.map((transfer) => {
                  const ownsSource = managedWarehouseIds.has(transfer.sourceWarehouseId);
                  const ownsDestination = managedWarehouseIds.has(transfer.destinationWarehouseId);
                  const creatorCannotReview =
                    canCreate && transfer.requestedByUserId === session?.userId;
                  const canReview =
                    ownsDestination &&
                    transfer.status === "REQUESTED" &&
                    (session?.role === "ADMIN" || (canCreate && !creatorCannotReview));
                  return (
                    <TableRow key={transfer.transferId}>
                      <TableCell className="font-mono text-xs">#{transfer.transferId}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <span>{transfer.sourceWarehouseName}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{transfer.destinationWarehouseName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {transfer.items.map((item) => (
                          <p key={item.transferItemId} className="text-xs">
                            {item.materialName} / {item.variantName}: {item.requestedQuantity}{" "}
                            {item.unit}
                            {(item.receivedQuantity > 0 ||
                              item.damagedQuantity > 0 ||
                              item.lostQuantity > 0) && (
                              <span className="block text-muted-foreground">
                                Received {item.receivedQuantity}, damaged {item.damagedQuantity},
                                lost {item.lostQuantity}
                              </span>
                            )}
                          </p>
                        ))}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(transfer.requestedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{transfer.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedTransfer(transfer)}
                          >
                            <Eye className="mr-1 h-3 w-3" /> Details
                          </Button>
                          {canReview && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!!busy}
                                onClick={() => setApprovalTransfer(transfer)}
                              >
                                <Check className="mr-1 h-3 w-3" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                disabled={!!busy}
                                onClick={() => mutate(transfer, "reject")}
                              >
                                <X className="mr-1 h-3 w-3" />
                                Reject
                              </Button>
                            </>
                          )}
                          {creatorCannotReview && transfer.status === "REQUESTED" && (
                            <span className="self-center text-xs text-muted-foreground">
                              Awaiting another approver
                            </span>
                          )}
                          {canCreate && ownsSource && transfer.status === "APPROVED" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!!busy}
                              onClick={() => setShippingTransfer(transfer)}
                            >
                              <Send className="mr-1 h-3 w-3" />
                              Ship
                            </Button>
                          )}
                          {canCreate &&
                            ownsSource &&
                            (transfer.status === "REQUESTED" || transfer.status === "APPROVED") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                disabled={!!busy}
                                onClick={() => mutate(transfer, "cancel")}
                              >
                                Cancel
                              </Button>
                            )}
                          {canCreate && ownsDestination && transfer.status === "IN_TRANSIT" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!!busy}
                              onClick={() => openReceipt(transfer)}
                            >
                              <PackageOpen className="mr-1 h-3 w-3" />
                              Receive remaining
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={approvalTransfer !== null}
        onOpenChange={(open) => !open && !busy && setApprovalTransfer(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approve transfer #{approvalTransfer?.transferId}</DialogTitle>
          </DialogHeader>
          {approvalTransfer && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Approval reserves stock in {approvalTransfer.sourceWarehouseName}. Confirm that
                every line still has enough unreserved, non-quarantined quantity.
              </p>
              <div className="space-y-2">
                {approvalTransfer.items.map((item) => {
                  const inventoryItem = approvalInventoryQuery.data?.find(
                    (record) => record.variantId === item.variantId,
                  );
                  const available = inventoryItem?.availableQuantity ?? 0;
                  const afterReservation = available - item.requestedQuantity;
                  const insufficient = item.requestedQuantity > available;
                  return (
                    <div
                      key={item.transferItemId}
                      className={`rounded-lg border p-3 ${insufficient ? "border-destructive/50 bg-destructive/5" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            {item.materialName} / {item.variantName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Requested {item.requestedQuantity} {item.unit}
                          </p>
                        </div>
                        <Badge variant={insufficient ? "destructive" : "secondary"}>
                          {insufficient ? "Insufficient" : "Available"}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-muted/50 p-2 text-xs sm:grid-cols-4">
                        <div>
                          <p className="text-muted-foreground">On hand</p>
                          <p className="font-medium tabular-nums">{inventoryItem?.quantity ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Reserved / quarantine</p>
                          <p className="font-medium tabular-nums">
                            {inventoryItem?.reservedQuantity ?? 0} /{" "}
                            {inventoryItem?.quarantineQuantity ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Available now</p>
                          <p className="font-medium tabular-nums">{available}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">After reservation</p>
                          <p
                            className={`font-medium tabular-nums ${afterReservation < 0 ? "text-destructive" : ""}`}
                          >
                            {afterReservation}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {approvalInventoryQuery.isError && (
                <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  <span>Current source inventory could not be loaded.</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => approvalInventoryQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              )}
              {approvalHasShortage && (
                <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    This transfer cannot be approved. The source manager should cancel it and submit
                    a smaller transfer, or replenish the source warehouse first.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={!!busy} onClick={() => setApprovalTransfer(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                !!busy ||
                approvalInventoryQuery.isLoading ||
                approvalInventoryQuery.isError ||
                approvalHasShortage
              }
              onClick={() => approvalTransfer && mutate(approvalTransfer, "approve")}
            >
              {approvalInventoryQuery.isLoading ? "Checking stock..." : "Approve and reserve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={shippingTransfer !== null}
        onOpenChange={(open) => !open && !busy && setShippingTransfer(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ship transfer #{shippingTransfer?.transferId}</DialogTitle>
          </DialogHeader>
          {shippingTransfer && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Shipping consumes the transfer reservation and removes the quantity from source
                on-hand stock.
              </p>
              {shippingTransfer.items.map((item) => {
                const inventoryItem = shippingInventoryQuery.data?.find(
                  (record) => record.variantId === item.variantId,
                );
                const unavailable =
                  !inventoryItem ||
                  inventoryItem.reservedQuantity < item.requestedQuantity ||
                  inventoryItem.quantity - inventoryItem.quarantineQuantity <
                    item.requestedQuantity;
                return (
                  <div
                    key={item.transferItemId}
                    className={`rounded-lg border p-3 ${unavailable ? "border-destructive/50 bg-destructive/5" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {item.materialName} / {item.variantName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ship {item.requestedQuantity} {item.unit}
                        </p>
                      </div>
                      <Badge variant={unavailable ? "destructive" : "secondary"}>
                        {unavailable ? "Unavailable" : "Reserved"}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-muted/50 p-2 text-xs sm:grid-cols-4">
                      <div>
                        <p className="text-muted-foreground">On hand</p>
                        <p className="font-medium tabular-nums">{inventoryItem?.quantity ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Reserved</p>
                        <p className="font-medium tabular-nums">
                          {inventoryItem?.reservedQuantity ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Quarantine</p>
                        <p className="font-medium tabular-nums">
                          {inventoryItem?.quarantineQuantity ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">On hand after ship</p>
                        <p
                          className={`font-medium tabular-nums ${unavailable ? "text-destructive" : ""}`}
                        >
                          {(inventoryItem?.quantity ?? 0) - item.requestedQuantity}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {shipmentHasUnavailableStock && (
                <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Reserved stock is no longer consistent. Reload inventory; if the reservation
                    cannot be restored, cancel the transfer before creating a replacement.
                  </p>
                </div>
              )}
              {shippingInventoryQuery.isError && (
                <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  <span>Current reserved inventory could not be loaded.</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => shippingInventoryQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={!!busy} onClick={() => setShippingTransfer(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                !!busy ||
                shippingInventoryQuery.isLoading ||
                shippingInventoryQuery.isError ||
                shipmentHasUnavailableStock
              }
              onClick={() => shippingTransfer && mutate(shippingTransfer, "ship")}
            >
              {shippingInventoryQuery.isLoading ? "Checking reservation..." : "Confirm shipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={creating}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open) resetCreate();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New warehouse transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Source warehouse</Label>
              <Select
                value={sourceWarehouseId}
                onValueChange={(value) => {
                  setSourceWarehouseId(value);
                  setVariantId("");
                  setQuantity("1");
                  if (value === destinationWarehouseId) setDestinationWarehouseId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select managed warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {(warehousesQuery.data ?? []).map((warehouse) => (
                    <SelectItem key={warehouse.warehouseId} value={String(warehouse.warehouseId)}>
                      {warehouse.warehouseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Destination warehouse</Label>
              <Select
                value={destinationWarehouseId}
                onValueChange={setDestinationWarehouseId}
                disabled={!sourceWarehouseId || warehousesQuery.isLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      sourceWarehouseId
                        ? "Select destination warehouse"
                        : "Select a source warehouse first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {destinationWarehouses.map((warehouse) => (
                    <SelectItem key={warehouse.warehouseId} value={String(warehouse.warehouseId)}>
                      {warehouse.warehouseName} ({warehouse.location})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose another warehouse from the locations available to your account.
              </p>
            </div>
            <div>
              <Label>Material variant</Label>
              <Select
                value={variantId}
                onValueChange={setVariantId}
                disabled={
                  !sourceWarehouseId ||
                  sourceInventoryQuery.isLoading ||
                  sourceInventoryQuery.isError ||
                  transferableInventory.length === 0
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !sourceWarehouseId
                        ? "Select a source warehouse first"
                        : sourceInventoryQuery.isLoading
                          ? "Loading available inventory..."
                          : transferableInventory.length === 0
                            ? "No transferable inventory"
                            : "Select available material"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {transferableInventory.map((item) => (
                    <SelectItem key={item.inventoryId} value={String(item.variantId)}>
                      {item.material?.materialName ?? "Unknown material"} —{" "}
                      {item.variantName ?? "Standard"}
                      {item.sku ? ` [${item.sku}]` : ""} · Available{" "}
                      {item.availableQuantity.toLocaleString()} {item.material?.unit ?? "units"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sourceInventoryQuery.isError && (
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-destructive">
                  <span>Could not load inventory for the selected warehouse.</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => sourceInventoryQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="transfer-quantity">Quantity</Label>
              <Input
                id="transfer-quantity"
                type="number"
                min="0.01"
                max={selectedInventory?.availableQuantity}
                step="0.01"
                value={quantity}
                disabled={!selectedInventory}
                onChange={(event) => setQuantity(event.target.value)}
              />
              {selectedInventory && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Available to transfer: {selectedInventory.availableQuantity.toLocaleString()}{" "}
                  {selectedInventory.material?.unit ?? "units"}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="transfer-note">Note</Label>
              <Textarea
                id="transfer-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={1000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreating(false)}
              disabled={busy === "create"}
            >
              Cancel
            </Button>
            <Button
              onClick={createTransfer}
              disabled={
                busy === "create" ||
                !sourceWarehouseId ||
                !destinationWarehouseId ||
                !selectedInventory
              }
            >
              {busy === "create" ? "Creating..." : "Create transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={receiptTransfer !== null}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setReceiptTransfer(null);
            setReceiptValues({});
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Receive transfer #{receiptTransfer?.transferId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Reconcile each shipped item as accepted, damaged, or lost. The combined quantity
              cannot exceed the remaining shipment.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Accepted</TableHead>
                  <TableHead>Damaged</TableHead>
                  <TableHead>Lost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receiptTransfer?.items.map((item) => {
                  const values = receiptValues[item.transferItemId];
                  if (!values) return null;
                  const remaining =
                    item.shippedQuantity -
                    item.receivedQuantity -
                    item.damagedQuantity -
                    item.lostQuantity;
                  const updateValue = (field: "accepted" | "damaged" | "lost", value: string) =>
                    setReceiptValues((current) => ({
                      ...current,
                      [item.transferItemId]: { ...current[item.transferItemId], [field]: value },
                    }));
                  return (
                    <TableRow key={item.transferItemId}>
                      <TableCell>
                        <p className="font-medium">{item.materialName}</p>
                        <p className="text-xs text-muted-foreground">{item.variantName}</p>
                      </TableCell>
                      <TableCell>
                        {remaining} {item.unit}
                      </TableCell>
                      {(["accepted", "damaged", "lost"] as const).map((field) => (
                        <TableCell key={field}>
                          <Input
                            aria-label={`${field} quantity for ${item.materialName}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={values[field]}
                            onChange={(event) => updateValue(field, event.target.value)}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => {
                setReceiptTransfer(null);
                setReceiptValues({});
              }}
            >
              Cancel
            </Button>
            <Button disabled={!!busy} onClick={receiveTransfer}>
              {busy?.startsWith("receive-") ? "Saving receipt..." : "Record receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedTransfer !== null}
        onOpenChange={(open) => !open && setSelectedTransfer(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transfer #{selectedTransfer?.transferId} audit trail</DialogTitle>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <AuditField
                  label="Requested"
                  value={`${new Date(selectedTransfer.requestedAt).toLocaleString()} · User #${selectedTransfer.requestedByUserId}`}
                />
                <AuditField
                  label="Approved"
                  value={
                    selectedTransfer.approvedAt
                      ? `${new Date(selectedTransfer.approvedAt).toLocaleString()} · User #${selectedTransfer.approvedByUserId}`
                      : "Not approved"
                  }
                />
                <AuditField
                  label="Shipped"
                  value={
                    selectedTransfer.shippedAt
                      ? `${new Date(selectedTransfer.shippedAt).toLocaleString()} · User #${selectedTransfer.shippedByUserId}`
                      : "Not shipped"
                  }
                />
                <AuditField
                  label="Received"
                  value={
                    selectedTransfer.receivedAt
                      ? `${new Date(selectedTransfer.receivedAt).toLocaleString()} · User #${selectedTransfer.receivedByUserId}`
                      : "Not received"
                  }
                />
              </div>
              {selectedTransfer.note && (
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Note</p>
                  <p>{selectedTransfer.note}</p>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Requested / shipped</TableHead>
                    <TableHead>Received / variance</TableHead>
                    <TableHead className="text-right">Transfer value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedTransfer.items.map((item) => (
                    <TableRow key={item.transferItemId}>
                      <TableCell>
                        {item.materialName} / {item.variantName}
                      </TableCell>
                      <TableCell>
                        {item.requestedQuantity} / {item.shippedQuantity} {item.unit}
                      </TableCell>
                      <TableCell>
                        {item.receivedQuantity} received · {item.damagedQuantity} damaged ·{" "}
                        {item.lostQuantity} lost
                      </TableCell>
                      <TableCell className="text-right">
                        {(item.unitCost * item.shippedQuantity).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTransfer(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AuditField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
