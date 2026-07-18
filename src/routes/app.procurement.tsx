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
import { Textarea } from "@/components/ui/textarea";
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
import { requireApiResult } from "@/api/client";
import { materialRequestsApi } from "@/api/materialRequests";
import { materialsApi } from "@/api/materials";

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

function emptyPOForm() {
  return {
    projectId: "",
    supplierId: "",
    warehouseId: "",
    requestItemId: "",
    variantId: "",
    materialId: "",
    quantity: "1",
    unitPrice: "0",
    expectedDeliveryDate: "",
    note: "",
  };
}

function ProcurementPage() {
  const session = useSession();
  const isLive = !!session?.token;
  const canCreate = session?.role === "WAREHOUSE_MANAGER";
  const canApproveOrReject = session?.role === "ADMIN" || session?.role === "PM";
  const canImport = session?.role === "WAREHOUSE_MANAGER";
  const [creating, setCreating] = useState(false);
  const [createMode, setCreateMode] = useState<"shortage" | "replenishment">("shortage");
  const [newPO, setNewPO] = useState(emptyPOForm);
  const [importOpen, setImportOpen] = useState(false);
  const [importPOId, setImportPOId] = useState<number | null>(null);
  const [receiptQuantities, setReceiptQuantities] = useState<Record<number, string>>({});
  const [receiptDamaged, setReceiptDamaged] = useState<Record<number, string>>({});
  const [receiptMissing, setReceiptMissing] = useState<Record<number, string>>({});
  const [receiptFinalDelivery, setReceiptFinalDelivery] = useState(false);
  const [receiptNote, setReceiptNote] = useState("");
  const [rejectPOId, setRejectPOId] = useState<number | null>(null);
  const [cancelPOId, setCancelPOId] = useState<number | null>(null);
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
  const { data: liveWarehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () =>
      requireApiResult(await warehousesApi.getAll(), "Could not load warehouses") ?? [],
    enabled: isLive && canCreate,
  });
  const { data: liveMaterials } = useQuery({
    queryKey: ["materials", "procurement-variants"],
    queryFn: async () =>
      requireApiResult(await materialsApi.getAll(), "Could not load material variants") ?? [],
    enabled: isLive && canCreate,
  });
  const {
    data: liveMaterialRequests,
    isLoading: shortagesLoading,
    isError: shortagesError,
    error: shortagesErrorValue,
    refetch: refetchShortages,
  } = useQuery({
    queryKey: ["material-requests", "procurement-shortages"],
    queryFn: async () =>
      requireApiResult(await materialRequestsApi.getAll(), "Could not load material shortages") ??
      [],
    enabled: isLive && canCreate,
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

  const ship = async (poId: number) => {
    setBusyAction(`ship-${poId}`);
    try {
      const response = await purchaseOrdersApi.ship(poId);
      if (!response.isSuccess) toast.error(response.errorMessage ?? "Could not mark PO shipped");
      else {
        toast.success(`PO #${poId} marked as shipped`);
        await refetchPOs();
      }
    } finally {
      setBusyAction(null);
    }
  };

  const cancel = async () => {
    if (!cancelPOId) return;
    const poId = cancelPOId;
    setBusyAction(`cancel-${poId}`);
    try {
      const response = await purchaseOrdersApi.cancel(poId);
      if (!response.isSuccess) toast.error(response.errorMessage ?? "Could not cancel PO");
      else {
        toast.success(`PO #${poId} cancelled`);
        setCancelPOId(null);
        await refetchPOs();
      }
    } finally {
      setBusyAction(null);
    }
  };

  const importToWarehouse = async () => {
    const po = (livePOs ?? []).find((item) => item.poId === importPOId);
    if (!po) {
      toast.error("Purchase order not found");
      return;
    }
    const items = po.items
      .map((item) => ({
        lineItemId: item.orderLineItemId,
        quantity: Number(receiptQuantities[item.orderLineItemId] ?? 0),
        damagedQuantity: Number(receiptDamaged[item.orderLineItemId] ?? 0),
        missingQuantity: Number(receiptMissing[item.orderLineItemId] ?? 0),
        remaining:
          item.quantity - item.receivedQuantity - item.damagedQuantity - item.missingQuantity,
      }))
      .filter((item) => item.quantity + item.damagedQuantity + item.missingQuantity > 0);
    if (
      items.length === 0 ||
      items.some(
        (item) =>
          item.quantity < 0 ||
          item.damagedQuantity < 0 ||
          item.missingQuantity < 0 ||
          item.quantity + item.damagedQuantity + item.missingQuantity > item.remaining,
      )
    ) {
      toast.error("Accepted, damaged, and missing quantities must fit within the remaining order");
      return;
    }
    if (!receiptFinalDelivery && items.some((item) => item.missingQuantity > 0)) {
      toast.error("Missing quantities can only be recorded on a final delivery");
      return;
    }
    setBusyAction(`import-${importPOId}`);
    try {
      const response = await purchaseOrdersApi.receive(importPOId!, {
        note: receiptNote.trim() || undefined,
        isFinalDelivery: receiptFinalDelivery,
        items: items.map(({ lineItemId, quantity, damagedQuantity, missingQuantity }) => ({
          lineItemId,
          quantity,
          damagedQuantity,
          missingQuantity,
        })),
      });
      if (response.isSuccess) {
        toast.success(`PO #${importPOId} imported to warehouse`);
        setImportOpen(false);
        setImportPOId(null);
        setReceiptQuantities({});
        setReceiptDamaged({});
        setReceiptMissing({});
        setReceiptFinalDelivery(false);
        setReceiptNote("");
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
    if (
      !newPO.projectId ||
      !newPO.supplierId ||
      !newPO.warehouseId ||
      !newPO.variantId ||
      !newPO.materialId
    ) {
      toast.error("Select a project, warehouse, material variant, and supplier");
      return;
    }
    if (createMode === "shortage" && !newPO.requestItemId) {
      toast.error("Select an approved material-request shortage");
      return;
    }
    const quantity = Number(newPO.quantity);
    const unitPrice = Number(newPO.unitPrice);
    const selectedShortage = shortageOptions.find(
      (option) => option.item.itemId === Number(newPO.requestItemId),
    );
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      toast.error("Unit price cannot be negative");
      return;
    }
    if (createMode === "shortage" && (!selectedShortage || quantity > selectedShortage.shortage)) {
      toast.error("Quantity cannot exceed the selected request shortage");
      return;
    }
    setBusyAction("create");
    try {
      const request = {
        projectId: Number(newPO.projectId),
        supplierId: Number(newPO.supplierId),
        warehouseId: Number(newPO.warehouseId),
        expectedDeliveryDate: newPO.expectedDeliveryDate || undefined,
        note: newPO.note.trim() || undefined,
        items: [
          {
            variantId: Number(newPO.variantId),
            materialId: Number(newPO.materialId),
            ...(createMode === "shortage" ? { requestItemId: Number(newPO.requestItemId) } : {}),
            quantity,
            unitPrice,
          },
        ],
      };
      const response =
        createMode === "shortage"
          ? await purchaseOrdersApi.createFromShortages(request)
          : await purchaseOrdersApi.create(request);
      if (response.isSuccess) {
        toast.success(
          createMode === "shortage"
            ? "Shortage purchase order created"
            : "Stock replenishment purchase order created",
        );
        setCreating(false);
        setNewPO(emptyPOForm());
        setCreateMode("shortage");
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
  const approved = scopedPOs.filter((po) =>
    ["APPROVED", "PROCESSING", "SHIPPED", "PARTIALLY_RECEIVED"].includes(po.status),
  );
  const rejected = scopedPOs.filter((po) => ["REJECTED", "CANCELLED"].includes(po.status));
  const delivered = scopedPOs.filter((po) =>
    ["DELIVERED", "CLOSED_WITH_VARIANCE"].includes(po.status),
  );
  const pipelineValue = scopedPOs.reduce((sum, po) => sum + po.totalAmount, 0);
  const projectName = (id: number) =>
    liveProjects?.find((project) => project.projectId === id)?.projectName ?? `#${id}`;
  const supplierName = (id: number) =>
    liveSuppliers?.find((supplier) => supplier.supplierId === id)?.companyName ?? `#${id}`;
  const selectedPO = scopedPOs.find((po) => po.poId === selectedPOId) ?? null;
  const selectedImportPO = scopedPOs.find((po) => po.poId === importPOId) ?? null;
  const orderedByRequestItem = new Map<number, number>();
  scopedPOs
    .filter((po) => po.status !== "REJECTED" && po.status !== "CANCELLED")
    .flatMap((po) => po.items)
    .forEach((item) => {
      if (!item.requestItemId) return;
      orderedByRequestItem.set(
        item.requestItemId,
        (orderedByRequestItem.get(item.requestItemId) ?? 0) + item.quantity,
      );
    });
  const shortageStatuses = new Set([
    "APPROVED",
    "PARTIALLY_APPROVED",
    "ISSUED",
    "PARTIALLY_ISSUED",
  ]);
  const shortageOptions = (liveMaterialRequests ?? []).flatMap((request) =>
    shortageStatuses.has(request.status)
      ? request.items
          .map((item) => ({
            request,
            item,
            shortage:
              item.quantity - item.approvedQuantity - (orderedByRequestItem.get(item.itemId) ?? 0),
          }))
          .filter((option) => option.shortage > 0 && !!request.warehouseId)
      : [],
  );
  const selectedShortage = shortageOptions.find(
    (option) => option.item.itemId === Number(newPO.requestItemId),
  );
  const replenishmentVariants = (liveMaterials ?? []).flatMap((material) =>
    material.variants
      .filter((variant) => variant.isActive)
      .map((variant) => ({
        ...variant,
        materialId: material.materialId,
        label: `${material.materialName} - ${variant.variantName}`,
      })),
  );
  const selectedReplenishmentVariant = replenishmentVariants.find(
    (variant) => variant.variantId === Number(newPO.variantId),
  );

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

      <Dialog
        open={creating}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open && busyAction !== "create") {
            setNewPO(emptyPOForm());
            setCreateMode("shortage");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Tabs
              value={createMode}
              onValueChange={(value) => {
                setCreateMode(value as "shortage" | "replenishment");
                setNewPO(emptyPOForm());
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="shortage">Request shortage</TabsTrigger>
                <TabsTrigger value="replenishment">Stock replenishment</TabsTrigger>
              </TabsList>
              <TabsContent value="shortage" className="mt-3 space-y-3">
                <SelectField
                  label="Unprocured material-request shortage"
                  value={newPO.requestItemId}
                  onValueChange={(value) => {
                    const selected = shortageOptions.find(
                      (option) => option.item.itemId === Number(value),
                    );
                    if (!selected) return;
                    setNewPO((po) => ({
                      ...po,
                      requestItemId: value,
                      projectId: String(selected.request.projectId),
                      warehouseId: String(selected.request.warehouseId),
                      variantId: String(selected.item.variantId),
                      materialId: String(selected.item.materialId),
                      quantity: String(selected.shortage),
                      supplierId: "",
                      unitPrice: "0",
                    }));
                  }}
                  placeholder={shortagesLoading ? "Loading shortages..." : "Select shortage"}
                  disabled={shortagesLoading || shortagesError || shortageOptions.length === 0}
                >
                  {shortageOptions.map(({ request, item, shortage }) => (
                    <SelectItem key={item.itemId} value={String(item.itemId)}>
                      MR #{request.requestId} · {item.materialName} /{" "}
                      {item.variantName || "Standard"} · {shortage} {item.unit ?? ""}
                    </SelectItem>
                  ))}
                </SelectField>
                {shortagesError ? (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    <span>
                      {shortagesErrorValue instanceof Error
                        ? shortagesErrorValue.message
                        : "Could not load material-request shortages"}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => refetchShortages()}>
                      Retry
                    </Button>
                  </div>
                ) : !shortagesLoading && shortageOptions.length === 0 ? (
                  <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                    No purchasing shortage exists. Fully allocated requests are already covered by
                    warehouse stock.
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Project</p>
                    <p className="font-medium">
                      {newPO.projectId ? projectName(Number(newPO.projectId)) : "Select a shortage"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Warehouse</p>
                    <p className="font-medium">
                      {newPO.warehouseId
                        ? (liveWarehouses?.find(
                            (warehouse) => warehouse.warehouseId === Number(newPO.warehouseId),
                          )?.warehouseName ?? `#${newPO.warehouseId}`)
                        : "Select a shortage"}
                    </p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="replenishment" className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Buy stock for a managed warehouse without linking it to a material request.
                </p>
                <SelectField
                  label="Project budget"
                  value={newPO.projectId}
                  onValueChange={(value) => setNewPO((po) => ({ ...po, projectId: value }))}
                  placeholder="Select project"
                >
                  {(liveProjects ?? [])
                    .filter(
                      (project) => project.status !== "COMPLETED" && project.status !== "CANCELLED",
                    )
                    .map((project) => (
                      <SelectItem key={project.projectId} value={String(project.projectId)}>
                        {project.projectName}
                      </SelectItem>
                    ))}
                </SelectField>
                <SelectField
                  label="Destination warehouse"
                  value={newPO.warehouseId}
                  onValueChange={(value) => setNewPO((po) => ({ ...po, warehouseId: value }))}
                  placeholder="Select managed warehouse"
                >
                  {(liveWarehouses ?? []).map((warehouse) => (
                    <SelectItem key={warehouse.warehouseId} value={String(warehouse.warehouseId)}>
                      {warehouse.warehouseName} ({warehouse.location})
                    </SelectItem>
                  ))}
                </SelectField>
                <SelectField
                  label="Material variant"
                  value={newPO.variantId}
                  onValueChange={(value) => {
                    const variant = replenishmentVariants.find(
                      (option) => option.variantId === Number(value),
                    );
                    setNewPO((po) => ({
                      ...po,
                      variantId: value,
                      materialId: variant ? String(variant.materialId) : "",
                      supplierId: "",
                    }));
                  }}
                  placeholder="Select material variant"
                >
                  {replenishmentVariants.map((variant) => (
                    <SelectItem key={variant.variantId} value={String(variant.variantId)}>
                      {variant.label} ({variant.unit})
                    </SelectItem>
                  ))}
                </SelectField>
              </TabsContent>
            </Tabs>
            <SelectField
              label="Supplier"
              value={newPO.supplierId}
              onValueChange={(value) =>
                setNewPO((po) => ({ ...po, supplierId: value, unitPrice: "0" }))
              }
              placeholder="Select supplier"
            >
              {(liveSuppliers ?? []).map((supplier) => (
                <SelectItem key={supplier.supplierId} value={String(supplier.supplierId)}>
                  {supplier.companyName}
                </SelectItem>
              ))}
            </SelectField>
            <div className="space-y-2">
              <div>
                <Label htmlFor="po-quantity">
                  Quantity
                  {createMode === "shortage" && selectedShortage?.item.unit
                    ? ` (${selectedShortage.item.unit})`
                    : createMode === "replenishment" && selectedReplenishmentVariant?.unit
                      ? ` (${selectedReplenishmentVariant.unit})`
                      : ""}
                </Label>
                <Input
                  id="po-quantity"
                  type="number"
                  min="0.01"
                  max={createMode === "shortage" ? selectedShortage?.shortage : undefined}
                  step="0.01"
                  value={newPO.quantity}
                  onChange={(event) => setNewPO((po) => ({ ...po, quantity: event.target.value }))}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {createMode === "shortage"
                    ? "Cannot exceed the selected request shortage."
                    : "The supplier catalog minimum is validated on submission."}
                </p>
              </div>
              <p className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                Price and minimum order quantity are validated against the backend supplier catalog
                when submitted.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="po-expected-date">Expected delivery</Label>
                <Input
                  id="po-expected-date"
                  type="date"
                  value={newPO.expectedDeliveryDate}
                  onChange={(event) =>
                    setNewPO((po) => ({ ...po, expectedDeliveryDate: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="po-note">Order note</Label>
                <Input
                  id="po-note"
                  value={newPO.note}
                  onChange={(event) => setNewPO((po) => ({ ...po, note: event.target.value }))}
                  maxLength={1000}
                  placeholder="Optional"
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

      <ConfirmDialog
        open={cancelPOId !== null}
        onOpenChange={(open) => !open && setCancelPOId(null)}
        title={`Cancel PO #${cancelPOId ?? ""}?`}
        description="The purchase order will be closed. Any outstanding on-order quantity will be released when allowed by the backend workflow."
        confirmLabel="Cancel PO"
        onConfirm={cancel}
        destructive
        busy={busyAction?.startsWith("cancel-") ?? false}
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
                  label="Warehouse"
                  value={selectedPO.warehouseName || `#${selectedPO.warehouseId}`}
                />
                <POInfo
                  label="Order date"
                  value={
                    selectedPO.orderDate ? new Date(selectedPO.orderDate).toLocaleDateString() : "-"
                  }
                />
                <POInfo
                  label="Delivery date"
                  value={
                    selectedPO.expectedDeliveryDate
                      ? new Date(selectedPO.expectedDeliveryDate).toLocaleDateString()
                      : "-"
                  }
                />
                <POInfo label="Items" value={String(selectedPO.items.length)} />
                <POInfo
                  label="Order value"
                  value={formatMoney(selectedPO.totalAmount, selectedPO.currency)}
                />
                <POInfo
                  label="Approved"
                  value={
                    selectedPO.approvedAt
                      ? `${new Date(selectedPO.approvedAt).toLocaleString()} · User #${selectedPO.approvedByUserId}`
                      : "-"
                  }
                />
              </div>
              {selectedPO.note && (
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-xs text-muted-foreground">Order note</p>
                  <p>{selectedPO.note}</p>
                </div>
              )}
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Unit price</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPO.items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
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
                        <TableCell className="text-right tabular-nums">
                          <p>{item.receivedQuantity.toLocaleString()}</p>
                          {(item.damagedQuantity > 0 || item.missingQuantity > 0) && (
                            <p className="text-xs text-destructive">
                              {item.damagedQuantity.toLocaleString()} damaged ·{" "}
                              {item.missingQuantity.toLocaleString()} missing
                            </p>
                          )}
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
            <DialogTitle>Receive PO #{importPOId} delivery</DialogTitle>
          </DialogHeader>
          {selectedImportPO && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Receiving into{" "}
                <span className="font-medium text-foreground">
                  {selectedImportPO.warehouseName || `warehouse #${selectedImportPO.warehouseId}`}
                </span>
                . The PO warehouse is locked.
              </p>
              {selectedImportPO.items.map((item) => {
                const remaining =
                  item.quantity -
                  item.receivedQuantity -
                  item.damagedQuantity -
                  item.missingQuantity;
                return (
                  <div
                    key={item.orderLineItemId}
                    className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_repeat(3,110px)] sm:items-end"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.materialName}</p>
                      <p className="text-xs text-muted-foreground">
                        Remaining {remaining} {item.unit}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor={`receipt-${item.orderLineItemId}`}>Accepted</Label>
                      <Input
                        id={`receipt-${item.orderLineItemId}`}
                        type="number"
                        min="0"
                        max={remaining}
                        step="0.01"
                        value={receiptQuantities[item.orderLineItemId] ?? "0"}
                        onChange={(event) =>
                          setReceiptQuantities((current) => ({
                            ...current,
                            [item.orderLineItemId]: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`damaged-${item.orderLineItemId}`}>Damaged</Label>
                      <Input
                        id={`damaged-${item.orderLineItemId}`}
                        type="number"
                        min="0"
                        max={remaining}
                        step="0.01"
                        value={receiptDamaged[item.orderLineItemId] ?? "0"}
                        onChange={(event) =>
                          setReceiptDamaged((current) => ({
                            ...current,
                            [item.orderLineItemId]: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`missing-${item.orderLineItemId}`}>Missing</Label>
                      <Input
                        id={`missing-${item.orderLineItemId}`}
                        type="number"
                        min="0"
                        max={remaining}
                        step="0.01"
                        disabled={!receiptFinalDelivery}
                        value={receiptMissing[item.orderLineItemId] ?? "0"}
                        onChange={(event) =>
                          setReceiptMissing((current) => ({
                            ...current,
                            [item.orderLineItemId]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                );
              })}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={receiptFinalDelivery}
                  onChange={(event) => setReceiptFinalDelivery(event.target.checked)}
                />
                This is the final delivery
              </label>
              <div>
                <Label htmlFor="receipt-note">Receipt note</Label>
                <Textarea
                  id="receipt-note"
                  value={receiptNote}
                  onChange={(event) => setReceiptNote(event.target.value)}
                  maxLength={1000}
                />
              </div>
            </div>
          )}
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
              {busyAction?.startsWith("import-") ? "Receiving..." : "Receive stock"}
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
              onCancel={setCancelPOId}
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
                      const po = scopedPOs.find((item) => item.poId === poId);
                      setReceiptQuantities(
                        Object.fromEntries(
                          (po?.items ?? []).map((item) => [
                            item.orderLineItemId,
                            String(
                              Math.max(
                                0,
                                item.quantity -
                                  item.receivedQuantity -
                                  item.damagedQuantity -
                                  item.missingQuantity,
                              ),
                            ),
                          ]),
                        ),
                      );
                      setReceiptNote("");
                      setImportOpen(true);
                    }
                  : undefined
              }
              onView={setSelectedPOId}
              onShip={canImport ? ship : undefined}
              onCancel={setCancelPOId}
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
  disabled,
  children,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
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
  onShip,
  onCancel,
  busyAction,
}: {
  rows: PurchaseOrderResponse[];
  projectName: (id: number) => string;
  supplierName: (id: number) => string;
  onApprove?: (poId: number) => void;
  onReject?: (poId: number) => void;
  onView?: (poId: number) => void;
  onImport?: (poId: number) => void;
  onShip?: (poId: number) => void;
  onCancel?: (poId: number) => void;
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
                    {["APPROVED", "PROCESSING", "SHIPPED", "PARTIALLY_RECEIVED"].includes(
                      po.status,
                    ) &&
                      onImport && (
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
                    {po.status === "APPROVED" && onShip && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!!busyAction}
                        onClick={() => onShip(po.poId)}
                      >
                        <Truck className="mr-1 h-3 w-3" /> Ship
                      </Button>
                    )}
                    {[
                      "PENDING",
                      "APPROVED",
                      "PROCESSING",
                      "SHIPPED",
                      "PARTIALLY_RECEIVED",
                    ].includes(po.status) &&
                      onCancel && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          disabled={!!busyAction}
                          onClick={() => onCancel(po.poId)}
                        >
                          Cancel
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
