import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, PackageOpen, Plus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { warehouseTransfersApi, type WarehouseTransferResponse } from "@/api/warehouseTransfers";
import { warehousesApi } from "@/api/warehouses";
import { materialsApi } from "@/api/materials";
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

export const Route = createFileRoute("/app/warehouse-transfers")({
  head: () => ({ meta: [{ title: "Warehouse Transfers - BuildSense AI" }] }),
  component: WarehouseTransfersPage,
});

function WarehouseTransfersPage() {
  const session = useSession();
  const canCreate = session?.role === "WAREHOUSE_MANAGER";
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");

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
  const materialsQuery = useQuery({
    queryKey: ["materials", "transfer-variants"],
    queryFn: async () =>
      requireApiResult(await materialsApi.getAll(), "Could not load material variants") ?? [],
    enabled: !!session?.token && canCreate,
  });

  const managedWarehouseIds = new Set(
    (warehousesQuery.data ?? []).map((warehouse) => warehouse.warehouseId),
  );
  const variants = (materialsQuery.data ?? []).flatMap((material) =>
    material.variants
      .filter((variant) => variant.isActive)
      .map((variant) => ({
        ...variant,
        label: `${material.materialName} — ${variant.variantName}`,
      })),
  );

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
      toast.success(`Transfer #${response.result.transferId} created`);
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
    action: "approve" | "reject" | "ship" | "receive" | "cancel",
  ) => {
    let receiptItems:
      | {
          transferItemId: number;
          quantity: number;
          damagedQuantity: number;
          lostQuantity: number;
        }[]
      | undefined;
    if (action === "receive") {
      receiptItems = [];
      for (const item of transfer.items) {
        const remaining =
          item.shippedQuantity - item.receivedQuantity - item.damagedQuantity - item.lostQuantity;
        if (remaining <= 0) continue;
        const accepted = window.prompt(
          `Accepted quantity for ${item.materialName}`,
          String(remaining),
        );
        const damaged = window.prompt(`Damaged quantity for ${item.materialName}`, "0");
        const lost = window.prompt(`Lost quantity for ${item.materialName}`, "0");
        if (accepted === null || damaged === null || lost === null) return;
        const values = [Number(accepted), Number(damaged), Number(lost)];
        if (
          values.some((value) => !Number.isFinite(value) || value < 0) ||
          values.reduce((a, b) => a + b, 0) > remaining
        ) {
          toast.error(`Receipt quantities for ${item.materialName} exceed the shipped remainder`);
          return;
        }
        receiptItems.push({
          transferItemId: item.transferItemId,
          quantity: values[0],
          damagedQuantity: values[1],
          lostQuantity: values[2],
        });
      }
      if (receiptItems.length === 0) return;
    }
    setBusy(`${action}-${transfer.transferId}`);
    try {
      const response =
        action === "approve"
          ? await warehouseTransfersApi.approve(transfer.transferId)
          : action === "reject"
            ? await warehouseTransfersApi.reject(transfer.transferId)
            : action === "ship"
              ? await warehouseTransfersApi.ship(transfer.transferId)
              : action === "receive"
                ? await warehouseTransfersApi.receive(transfer.transferId, receiptItems)
                : await warehouseTransfersApi.cancel(transfer.transferId);
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? `Could not ${action} transfer`);
        return;
      }
      toast.success(`Transfer #${transfer.transferId} ${action}d`);
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
                          {ownsDestination && transfer.status === "REQUESTED" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!!busy}
                                onClick={() => mutate(transfer, "approve")}
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
                          {ownsSource && transfer.status === "APPROVED" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!!busy}
                              onClick={() => mutate(transfer, "ship")}
                            >
                              <Send className="mr-1 h-3 w-3" />
                              Ship
                            </Button>
                          )}
                          {ownsSource &&
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
                          {ownsDestination && transfer.status === "IN_TRANSIT" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!!busy}
                              onClick={() => mutate(transfer, "receive")}
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
              <Select value={sourceWarehouseId} onValueChange={setSourceWarehouseId}>
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
              <Label htmlFor="destination-warehouse">Destination warehouse ID</Label>
              <Input
                id="destination-warehouse"
                type="number"
                min="1"
                value={destinationWarehouseId}
                onChange={(event) => setDestinationWarehouseId(event.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The backend exposes only warehouses you manage. Enter the destination ID supplied by
                operations.
              </p>
            </div>
            <div>
              <Label>Material variant</Label>
              <Select value={variantId} onValueChange={setVariantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select variant" />
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
              <Label htmlFor="transfer-quantity">Quantity</Label>
              <Input
                id="transfer-quantity"
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
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
            <Button onClick={createTransfer} disabled={busy === "create"}>
              {busy === "create" ? "Creating..." : "Create transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
