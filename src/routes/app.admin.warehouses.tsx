import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Eye, Warehouse } from "lucide-react";
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
import { requireApiResult } from "@/api/client";

export const Route = createFileRoute("/app/admin/warehouses")({
  head: () => ({ meta: [{ title: "Warehouses — BuildSense AI" }] }),
  component: WarehousesPage,
});

function WarehousesPage() {
  const session = useSession();
  const isLive = !!session?.token;
  const canCreateWarehouse = session?.role === "ADMIN";

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
  const [form, setForm] = useState({ warehouseName: "", location: "" });
  const [selectedId, setSelectedId] = useState<number | null>(null);

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

  const submitCreate = async () => {
    if (!form.warehouseName.trim()) {
      toast.error("Warehouse name required");
      return;
    }
    setSaving(true);
    try {
      const r = await warehousesApi.create(form);
      if (r.isSuccess) {
        toast.success("Warehouse created");
        setCreating(false);
        setForm({ warehouseName: "", location: "" });
        refetch();
      } else toast.error(r.errorMessage ?? "Create failed");
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
                placeholder="Main Site Warehouse"
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="warehouse-location">Location</Label>
              <Input
                id="warehouse-location"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
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
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-primary" />
                {warehouses?.find((w) => w.warehouseId === selectedId)?.warehouseName ??
                  "Inventory"}
              </CardTitle>
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
