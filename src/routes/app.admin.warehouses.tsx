import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Eye, History, RotateCcw, SlidersHorizontal, Warehouse } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { useSession } from "@/lib/session";
import { warehousesApi } from "@/api/warehouses";
import { usersApi } from "@/api/users";
import { materialsApi } from "@/api/materials";
import { requireApiResult } from "@/api/client";
import { Textarea } from "@/components/ui/textarea";
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
  const [adjustment, setAdjustment] = useState({ variantId: "", quantityDelta: "", note: "" });
  const [returning, setReturning] = useState(false);
  const [inventoryReturn, setInventoryReturn] = useState({
    variantId: "",
    quantity: "",
    materialRequestId: "",
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

  const {
    data: inventory,
    isLoading: invLoading,
    isError: inventoryError,
    error: inventoryErrorValue,
    refetch: refetchInventory,
  } = useQuery({
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
    enabled: isLive && canAdjustInventory && (adjusting || returning),
    staleTime: 30_000,
  });
  const variants = (materialsQuery.data ?? []).flatMap((material) =>
    material.variants
      .filter((variant) => variant.isActive)
      .map((variant) => ({
        ...variant,
        label: `${material.materialName} â€” ${variant.variantName}`,
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
        toast.success("Warehouse created");
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
    setSaving(true);
    try {
      const response = await warehousesApi.adjustInventory({
        warehouseId: selectedId,
        variantId,
        quantityDelta,
        note: adjustment.note.trim() || undefined,
        rowVersion: current?.rowVersion,
      });
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Inventory adjustment failed");
        return;
      }
      toast.success("Inventory adjusted");
      setAdjusting(false);
      setAdjustment({ variantId: "", quantityDelta: "", note: "" });
      await Promise.all([refetchInventory(), transactionsQuery.refetch()]);
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setSaving(false);
    }
  };

  const submitReturn = async () => {
    const variantId = Number(inventoryReturn.variantId);
    const quantity = Number(inventoryReturn.quantity);
    const materialRequestId = inventoryReturn.materialRequestId
      ? Number(inventoryReturn.materialRequestId)
      : undefined;
    if (!selectedId || !variantId || !Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Select a variant and enter a return quantity greater than 0");
      return;
    }
    if (
      materialRequestId !== undefined &&
      (!Number.isInteger(materialRequestId) || materialRequestId <= 0)
    ) {
      toast.error("Material request ID must be a positive whole number");
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
        note: inventoryReturn.note.trim() || undefined,
        rowVersion: current?.rowVersion,
      });
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Inventory return failed");
        return;
      }
      toast.success("Inventory return recorded");
      setReturning(false);
      setInventoryReturn({ variantId: "", quantity: "", materialRequestId: "", note: "" });
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
        section="Admin"
        title="Warehouses"
        description="Manage material warehouses and view real-time inventory levels."
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
            <Button onClick={submitAdjustment} disabled={saving}>
              {saving ? "Applying..." : "Apply adjustment"}
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
              <Label>Material variant</Label>
              <Select
                value={inventoryReturn.variantId}
                onValueChange={(variantId) =>
                  setInventoryReturn((current) => ({ ...current, variantId }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select returned variant" />
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
              <Label htmlFor="return-quantity">Returned quantity</Label>
              <Input
                id="return-quantity"
                type="number"
                min="0.01"
                step="0.01"
                value={inventoryReturn.quantity}
                onChange={(event) =>
                  setInventoryReturn((current) => ({ ...current, quantity: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="return-request-id">Material request ID (optional)</Label>
              <Input
                id="return-request-id"
                type="number"
                min="1"
                step="1"
                value={inventoryReturn.materialRequestId}
                onChange={(event) =>
                  setInventoryReturn((current) => ({
                    ...current,
                    materialRequestId: event.target.value,
                  }))
                }
              />
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
            <Button onClick={submitReturn} disabled={saving}>
              {saving ? "Recording..." : "Record return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid lg:grid-cols-[1fr_420px] gap-4">
        {/* Warehouse list */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {!isLive ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Sign in with a real account to view warehouses.
              </div>
            ) : isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : isError ? (
              <QueryError
                message={error instanceof Error ? error.message : undefined}
                onRetry={() => refetch()}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Inventory</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(warehouses ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No warehouses yet — create one above
                      </TableCell>
                    </TableRow>
                  )}
                  {(warehouses ?? []).map((w) => (
                    <TableRow
                      key={w.warehouseId}
                      className={selectedId === w.warehouseId ? "bg-muted/50" : ""}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{w.warehouseName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {w.location || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={selectedId === w.warehouseId ? "secondary" : "outline"}
                          className="h-7 text-xs"
                          onClick={() =>
                            setSelectedId(selectedId === w.warehouseId ? null : w.warehouseId)
                          }
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {selectedId === w.warehouseId ? "Hide" : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Inventory panel */}
        {selectedId && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Warehouse className="h-4 w-4 text-primary" />
                  {warehouses?.find((w) => w.warehouseId === selectedId)?.warehouseName ??
                    "Inventory"}
                </CardTitle>
                {canAdjustInventory && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setReturning(true)}>
                      <RotateCcw className="mr-1 h-3.5 w-3.5" /> Return
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAdjusting(true)}>
                      <SlidersHorizontal className="mr-1 h-3.5 w-3.5" /> Adjust
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {invLoading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Loading inventory…
                </div>
              ) : inventoryError ? (
                <QueryError
                  message={
                    inventoryErrorValue instanceof Error ? inventoryErrorValue.message : undefined
                  }
                  onRetry={() => refetchInventory()}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(inventory ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                          Warehouse is empty
                        </TableCell>
                      </TableRow>
                    )}
                    {(inventory ?? []).map((item) => (
                      <TableRow key={item.inventoryId}>
                        <TableCell className="font-medium">
                          {item.material?.materialName ?? `Material #${item.materialId}`}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.material?.unit ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="tabular-nums">
                            {item.quantity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="border-t p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
                  <History className="h-3.5 w-3.5" /> Recent transactions
                </p>
                {transactionsQuery.isLoading ? (
                  <p className="text-xs text-muted-foreground">Loading transactions...</p>
                ) : transactionsQuery.isError ? (
                  <p className="text-xs text-destructive">Could not load the transaction log.</p>
                ) : (transactionsQuery.data ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No inventory transactions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(transactionsQuery.data ?? []).slice(0, 8).map((transaction) => (
                      <div
                        key={transaction.transactionId}
                        className="flex items-start justify-between gap-2 rounded border p-2 text-xs"
                      >
                        <div>
                          <p className="font-medium">{transaction.transactionType}</p>
                          <p className="text-muted-foreground">
                            Variant #{transaction.variantId}
                            {transaction.note ? ` â€” ${transaction.note}` : ""}
                          </p>
                        </div>
                        <div className="text-right tabular-nums">
                          <p
                            className={
                              transaction.quantity > 0 ? "text-success" : "text-destructive"
                            }
                          >
                            {transaction.quantity > 0 ? "+" : ""}
                            {transaction.quantity}
                          </p>
                          <p className="text-muted-foreground">
                            {new Date(transaction.transactionDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
