import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  CircleDollarSign,
  Clock3,
  Download,
  Eye,
  PackageCheck,
  Plus,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, statusConfig } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useSession } from "@/lib/session";
import { purchaseOrdersApi, type PurchaseOrderResponse } from "@/api/purchaseOrders";
import { projectsApi } from "@/api/projects";
import { suppliersApi } from "@/api/suppliers";
import { warehousesApi } from "@/api/warehouses";
import { materialsApi } from "@/api/materials";
import { requireApiResult } from "@/api/client";

export const Route = createFileRoute("/app/procurement")({
  head: () => ({ meta: [{ title: "Procurement - BuildSense AI" }] }),
  component: ProcurementPage,
});

function purchaseOrderErrorMessage(result: unknown, fallback: string): string {
  if (typeof result === "string" && result.trim()) return result;
  if (typeof result !== "object" || result === null) return fallback;

  const budget = result as {
    message?: string;
    remainingBudget?: number;
    currentOrder?: number;
    currency?: string;
  };
  if (typeof budget.remainingBudget !== "number" || typeof budget.currentOrder !== "number") {
    return budget.message || fallback;
  }
  const currency = budget.currency || "VND";
  return `${budget.message || "Purchase order exceeds project budget"}. Remaining: ${budget.remainingBudget.toLocaleString()} ${currency}; this order: ${budget.currentOrder.toLocaleString()} ${currency}.`;
}

function formatMoney(value: number, currency = "VND"): string {
  return `${value.toLocaleString()} ${currency}`;
}

function ProcurementPage() {
  const session = useSession();
  const isLive = !!session?.token;
  const canCreate = session?.role === "WAREHOUSE_MANAGER" || session?.role === "ADMIN";
  const canApproveOrReject = session?.role === "PM" || session?.role === "ADMIN";
  const canImport = session?.role === "WAREHOUSE_MANAGER" || session?.role === "ADMIN";
  const [creating, setCreating] = useState(false);
  const [newPO, setNewPO] = useState({
    projectId: "",
    supplierId: "",
    materialId: "",
    quantity: "1",
    unitPrice: "0",
  });
  const [importOpen, setImportOpen] = useState(false);
  const [importPOId, setImportPOId] = useState<number | null>(null);
  const [importWarehouseId, setImportWarehouseId] = useState("");
  const [rejectPOId, setRejectPOId] = useState<number | null>(null);
  const [selectedPOId, setSelectedPOId] = useState<number | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const {
    data: livePOs,
    refetch: refetchPOs,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const response = await purchaseOrdersApi.getAll();
      return requireApiResult(response, "Could not load purchase orders") ?? [];
    },
    enabled: isLive,
    staleTime: 10_000,
  });

  const { data: liveProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () =>
      requireApiResult(await projectsApi.getAll(), "Could not load projects") ?? [],
    enabled: isLive,
  });
  const { data: liveSuppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () =>
      requireApiResult(await suppliersApi.getAll(), "Could not load suppliers") ?? [],
    enabled: isLive,
  });
  const { data: liveMaterials } = useQuery({
    queryKey: ["materials"],
    queryFn: async () =>
      requireApiResult(await materialsApi.getAll(), "Could not load materials") ?? [],
    enabled: isLive,
  });
  const { data: liveWarehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () =>
      requireApiResult(await warehousesApi.getAll(), "Could not load warehouses") ?? [],
    enabled: isLive,
  });

  const approve = async (poId: number) => {
    setBusyAction(`approve-${poId}`);
    try {
      const response = await purchaseOrdersApi.approve(poId);
      if (response.isSuccess) {
        toast.success(`PO #${poId} approved`);
        refetchPOs();
      } else {
        toast.error(response.errorMessage ?? "Approve failed");
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setBusyAction(null);
    }
  };

  const reject = async () => {
    if (!rejectPOId) return;
    const poId = rejectPOId;
    setBusyAction(`reject-${poId}`);
    try {
      const response = await purchaseOrdersApi.reject(poId);
      if (response.isSuccess) {
        toast.success(`PO #${poId} rejected`);
        setRejectPOId(null);
        await refetchPOs();
      } else {
        toast.error(response.errorMessage ?? "Reject failed");
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setBusyAction(null);
    }
  };

  const importToWarehouse = async () => {
    if (!importPOId || !importWarehouseId) {
      toast.error("Select a warehouse");
      return;
    }
    setBusyAction(`import-${importPOId}`);
    try {
      const response = await purchaseOrdersApi.importToWarehouse(
        importPOId,
        Number(importWarehouseId),
      );
      if (response.isSuccess) {
        toast.success(`PO #${importPOId} imported to warehouse`);
        setImportOpen(false);
        setImportPOId(null);
        setImportWarehouseId("");
        refetchPOs();
      } else {
        toast.error(response.errorMessage ?? "Import failed");
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setBusyAction(null);
    }
  };

  const submitCreate = async () => {
    if (!newPO.projectId || !newPO.supplierId || !newPO.materialId) {
      toast.error("Project, supplier and material are required");
      return;
    }
    const quantity = Number(newPO.quantity);
    const unitPrice = Number(newPO.unitPrice);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      toast.error("Unit price cannot be negative");
      return;
    }
    setBusyAction("create");
    try {
      const response = await purchaseOrdersApi.create({
        projectId: Number(newPO.projectId),
        supplierId: Number(newPO.supplierId),
        items: [
          {
            materialId: Number(newPO.materialId),
            quantity,
            unitPrice,
          },
        ],
      });
      if (response.isSuccess) {
        toast.success("Purchase order created");
        setCreating(false);
        setNewPO({ projectId: "", supplierId: "", materialId: "", quantity: "1", unitPrice: "0" });
        refetchPOs();
      } else {
        toast.error(
          response.errorMessage ?? purchaseOrderErrorMessage(response.result, "Create failed"),
        );
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setBusyAction(null);
    }
  };

  const allPOs = livePOs ?? [];
  const pmProjectIds = new Set(
    (liveProjects ?? [])
      .filter((project) => project.pmUserID === session?.userId)
      .map((project) => project.projectId),
  );
  const scopedPOs =
    session?.role === "PM" ? allPOs.filter((po) => pmProjectIds.has(po.projectId)) : allPOs;
  const pending = scopedPOs.filter((po) => po.status === "PENDING");
  const approved = scopedPOs.filter((po) => po.status === "APPROVED");
  const rejected = scopedPOs.filter((po) => po.status === "REJECTED");
  const delivered = scopedPOs.filter((po) => po.status === "DELIVERED");
  const pipelineValue = scopedPOs.reduce((sum, po) => sum + po.totalAmount, 0);
  const projectName = (id: number) =>
    liveProjects?.find((project) => project.projectId === id)?.projectName ?? `#${id}`;
  const supplierName = (id: number) =>
    liveSuppliers?.find((supplier) => supplier.supplierId === id)?.companyName ?? `#${id}`;
  const selectedMaterial = liveMaterials?.find(
    (material) => material.materialId === Number(newPO.materialId),
  );
  const selectedPO = scopedPOs.find((po) => po.poId === selectedPOId) ?? null;

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Operations"
        title="Procurement"
        description="Create, approve, and receive backend purchase orders."
        actions={
          isLive && canCreate ? (
            <Button size="sm" className="h-8 text-xs" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New PO
            </Button>
          ) : undefined
        }
      />

      {isLive && !isLoading && (
        <div className="mb-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ProcurementMetric icon={Clock3} label="Pending approval" value={pending.length} />
            <ProcurementMetric icon={Truck} label="Awaiting receipt" value={approved.length} />
            <ProcurementMetric icon={X} label="Rejected" value={rejected.length} />
            <ProcurementMetric icon={PackageCheck} label="Delivered" value={delivered.length} />
            <ProcurementMetric
              icon={CircleDollarSign}
              label="Pipeline value (VND)"
              value={formatMoney(pipelineValue)}
            />
          </div>
          <PipelineBar
            pending={pending.length}
            approved={approved.length}
            rejected={rejected.length}
            delivered={delivered.length}
          />
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <SelectField
              label="Project"
              value={newPO.projectId}
              onValueChange={(value) => setNewPO((po) => ({ ...po, projectId: value }))}
              placeholder="Select project"
            >
              {(liveProjects ?? []).map((project) => (
                <SelectItem key={project.projectId} value={String(project.projectId)}>
                  {project.projectName}
                </SelectItem>
              ))}
            </SelectField>
            <SelectField
              label="Supplier"
              value={newPO.supplierId}
              onValueChange={(value) => setNewPO((po) => ({ ...po, supplierId: value }))}
              placeholder="Select supplier"
            >
              {(liveSuppliers ?? []).map((supplier) => (
                <SelectItem key={supplier.supplierId} value={String(supplier.supplierId)}>
                  {supplier.companyName}
                </SelectItem>
              ))}
            </SelectField>
            <SelectField
              label="Material"
              value={newPO.materialId}
              onValueChange={(value) => setNewPO((po) => ({ ...po, materialId: value }))}
              placeholder="Select material"
            >
              {(liveMaterials ?? []).map((material) => (
                <SelectItem key={material.materialId} value={String(material.materialId)}>
                  {material.materialName} ({material.unit})
                </SelectItem>
              ))}
            </SelectField>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="po-quantity">
                  Quantity{selectedMaterial?.unit ? ` (${selectedMaterial.unit})` : ""}
                </Label>
                <Input
                  id="po-quantity"
                  type="number"
                  min="1"
                  value={newPO.quantity}
                  onChange={(event) => setNewPO((po) => ({ ...po, quantity: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="po-unit-price">Unit price</Label>
                <Input
                  id="po-unit-price"
                  type="number"
                  min="0"
                  value={newPO.unitPrice}
                  onChange={(event) => setNewPO((po) => ({ ...po, unitPrice: event.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreating(false)}
              disabled={busyAction === "create"}
            >
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={busyAction === "create"}>
              {busyAction === "create" ? "Creating..." : "Create PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={rejectPOId !== null}
        onOpenChange={(open) => {
          if (!open && !busyAction?.startsWith("reject-")) setRejectPOId(null);
        }}
        title={`Reject PO #${rejectPOId ?? ""}?`}
        description="This purchase order will be marked as rejected and can no longer be approved or imported."
        confirmLabel="Reject PO"
        onConfirm={reject}
        destructive
        busy={busyAction?.startsWith("reject-") ?? false}
      />

      <Dialog open={selectedPOId !== null} onOpenChange={(open) => !open && setSelectedPOId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Purchase Order #{selectedPOId}</DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <POInfo
                  label="Project"
                  value={selectedPO.projectName || projectName(selectedPO.projectId)}
                />
                <POInfo
                  label="Supplier"
                  value={selectedPO.supplierName || supplierName(selectedPO.supplierId)}
                />
                <POInfo label="Status" value={selectedPO.status} />
                <POInfo label="Currency" value={selectedPO.currency} />
                <POInfo
                  label="Order date"
                  value={
                    selectedPO.orderDate ? new Date(selectedPO.orderDate).toLocaleDateString() : "-"
                  }
                />
                <POInfo
                  label="Delivery date"
                  value={
                    selectedPO.deliveryDate
                      ? new Date(selectedPO.deliveryDate).toLocaleDateString()
                      : "-"
                  }
                />
                <POInfo label="Items" value={String(selectedPO.items.length)} />
                <POInfo
                  label="Order value"
                  value={formatMoney(selectedPO.totalAmount, selectedPO.currency)}
                />
              </div>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Unit price</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPO.items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          No line-item details returned by the backend.
                        </TableCell>
                      </TableRow>
                    )}
                    {selectedPO.items.map((item) => (
                      <TableRow key={item.orderLineItemId || `${item.materialId}-${item.quantity}`}>
                        <TableCell>
                          <p className="font-medium">{item.materialName}</p>
                          <p className="text-xs text-muted-foreground">
                            Material #{item.materialId}
                          </p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell>{item.unit || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(item.unitPrice, selectedPO.currency)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(item.subTotal, selectedPO.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import PO #{importPOId} to Warehouse</DialogTitle>
          </DialogHeader>
          <SelectField
            label="Warehouse"
            value={importWarehouseId}
            onValueChange={setImportWarehouseId}
            placeholder="Select warehouse"
          >
            {(liveWarehouses ?? []).map((warehouse) => (
              <SelectItem key={warehouse.warehouseId} value={String(warehouse.warehouseId)}>
                {warehouse.warehouseName}
              </SelectItem>
            ))}
          </SelectField>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportOpen(false)}
              disabled={busyAction?.startsWith("import-")}
            >
              Cancel
            </Button>
            <Button onClick={importToWarehouse} disabled={busyAction?.startsWith("import-")}>
              <Download className="h-3.5 w-3.5 mr-1" />{" "}
              {busyAction?.startsWith("import-") ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isLive ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Sign in with a real backend account to manage purchase orders.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Loading purchase orders...
        </div>
      ) : isError ? (
        <QueryError
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetchPOs()}
        />
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending
              {pending.length > 0 && (
                <Badge className="ml-1.5 h-4 min-w-[1rem] rounded-full text-[9px] p-0 flex items-center justify-center">
                  {pending.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Awaiting receipt
              {approved.length > 0 && (
                <Badge className="ml-1.5 h-4 min-w-[1rem] rounded-full p-0 text-[9px] flex items-center justify-center">
                  {approved.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected
              {rejected.length > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1.5 h-4 min-w-[1rem] rounded-full p-0 text-[9px] flex items-center justify-center"
                >
                  {rejected.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            <PurchaseOrderTable
              rows={pending}
              projectName={projectName}
              supplierName={supplierName}
              onApprove={canApproveOrReject ? approve : undefined}
              onReject={canApproveOrReject ? setRejectPOId : undefined}
              onView={setSelectedPOId}
              busyAction={busyAction}
            />
          </TabsContent>
          <TabsContent value="approved">
            <PurchaseOrderTable
              rows={approved}
              projectName={projectName}
              supplierName={supplierName}
              onImport={
                canImport
                  ? (poId) => {
                      setImportPOId(poId);
                      setImportWarehouseId("");
                      setImportOpen(true);
                    }
                  : undefined
              }
              onView={setSelectedPOId}
              busyAction={busyAction}
            />
          </TabsContent>
          <TabsContent value="rejected">
            <PurchaseOrderTable
              rows={rejected}
              projectName={projectName}
              supplierName={supplierName}
              onView={setSelectedPOId}
              busyAction={busyAction}
            />
          </TabsContent>
          <TabsContent value="delivered">
            <PurchaseOrderTable
              rows={delivered}
              projectName={projectName}
              supplierName={supplierName}
              onView={setSelectedPOId}
              busyAction={busyAction}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ProcurementMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function POInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function PipelineBar({
  pending,
  approved,
  rejected,
  delivered,
}: {
  pending: number;
  approved: number;
  rejected: number;
  delivered: number;
}) {
  const total = pending + approved + rejected + delivered;
  const width = (value: number) => (total ? `${(value / total) * 100}%` : "0%");

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <p className="font-medium">Purchase order pipeline</p>
          <div className="flex gap-3 text-muted-foreground">
            <span>{pending} pending</span>
            <span>{approved} awaiting receipt</span>
            <span>{rejected} rejected</span>
            <span>{delivered} delivered</span>
          </div>
        </div>
        <div
          className="flex h-2.5 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`${pending} pending, ${approved} awaiting receipt, ${rejected} rejected, ${delivered} delivered`}
        >
          <span className="bg-warning" style={{ width: width(pending) }} />
          <span className="bg-primary" style={{ width: width(approved) }} />
          <span className="bg-destructive" style={{ width: width(rejected) }} />
          <span className="bg-success" style={{ width: width(delivered) }} />
        </div>
      </CardContent>
    </Card>
  );
}

function SelectField({
  label,
  value,
  onValueChange,
  placeholder,
  children,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

function PurchaseOrderTable({
  rows,
  projectName,
  supplierName,
  onApprove,
  onReject,
  onView,
  onImport,
  busyAction,
}: {
  rows: PurchaseOrderResponse[];
  projectName: (id: number) => string;
  supplierName: (id: number) => string;
  onApprove?: (poId: number) => void;
  onReject?: (poId: number) => void;
  onView?: (poId: number) => void;
  onImport?: (poId: number) => void;
  busyAction?: string | null;
}) {
  const items = rows ?? [];
  return (
    <Card className="shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO #</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Order value</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No purchase orders
                </TableCell>
              </TableRow>
            )}
            {items.map((po) => (
              <TableRow key={po.poId}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  #{po.poId}
                </TableCell>
                <TableCell className="font-medium">{projectName(po.projectId)}</TableCell>
                <TableCell>{supplierName(po.supplierId)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(po.totalAmount, po.currency)}
                </TableCell>
                <TableCell className="text-xs">
                  {po.orderDate ? new Date(po.orderDate).toLocaleDateString() : "-"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      statusConfig[po.status.toLowerCase() as keyof typeof statusConfig]?.cls ?? "",
                    )}
                  >
                    {po.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {onView && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => onView(po.poId)}
                      >
                        <Eye className="mr-1 h-3 w-3" /> Details
                      </Button>
                    )}
                    {po.status === "PENDING" && (onApprove || onReject) && (
                      <>
                        {onReject && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => onReject(po.poId)}
                            disabled={busyAction !== null}
                          >
                            <X className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        )}
                        {onApprove && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => onApprove(po.poId)}
                            disabled={busyAction !== null}
                          >
                            <Check className="h-3 w-3 mr-1" />{" "}
                            {busyAction === `approve-${po.poId}` ? "Approving..." : "Approve"}
                          </Button>
                        )}
                      </>
                    )}
                    {po.status === "APPROVED" && onImport && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => onImport(po.poId)}
                        disabled={busyAction !== null}
                      >
                        <Download className="h-3 w-3 mr-1" /> Import
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
