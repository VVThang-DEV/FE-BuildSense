import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Download, Plus } from "lucide-react";
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
import { useSession } from "@/lib/session";
import { purchaseOrdersApi } from "@/api/purchaseOrders";
import { projectsApi } from "@/api/projects";
import { suppliersApi } from "@/api/suppliers";
import { warehousesApi } from "@/api/warehouses";
import { materialsApi } from "@/api/materials";
import { requireApiResult } from "@/api/client";

export const Route = createFileRoute("/app/procurement")({
  head: () => ({ meta: [{ title: "Procurement - BuildSense AI" }] }),
  component: ProcurementPage,
});

function ProcurementPage() {
  const session = useSession();
  const isLive = !!session?.token;
  const canCreate = session?.role === "PM" || session?.role === "ADMIN";
  const canApproveOrImport = session?.role === "WAREHOUSE_MANAGER" || session?.role === "ADMIN";
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
    setBusyAction("create");
    try {
      const response = await purchaseOrdersApi.create({
        projectId: Number(newPO.projectId),
        supplierId: Number(newPO.supplierId),
        items: [
          {
            materialId: Number(newPO.materialId),
            quantity: Number(newPO.quantity) || 1,
            unitPrice: Number(newPO.unitPrice) || 0,
          },
        ],
      });
      if (response.isSuccess) {
        toast.success("Purchase order created");
        setCreating(false);
        setNewPO({ projectId: "", supplierId: "", materialId: "", quantity: "1", unitPrice: "0" });
        refetchPOs();
      } else {
        toast.error(response.errorMessage ?? "Create failed");
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setBusyAction(null);
    }
  };

  const pending = (livePOs ?? []).filter((po) => po.status === "PENDING");
  const history = (livePOs ?? []).filter((po) => po.status !== "PENDING");
  const projectName = (id: number) =>
    liveProjects?.find((project) => project.projectId === id)?.projectName ?? `#${id}`;
  const supplierName = (id: number) =>
    liveSuppliers?.find((supplier) => supplier.supplierId === id)?.companyName ?? `#${id}`;

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
                  {material.materialName}
                </SelectItem>
              ))}
            </SelectField>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="po-quantity">Quantity</Label>
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
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            <PurchaseOrderTable
              rows={pending}
              projectName={projectName}
              supplierName={supplierName}
              onApprove={canApproveOrImport ? approve : undefined}
              busyAction={busyAction}
            />
          </TabsContent>
          <TabsContent value="history">
            <PurchaseOrderTable
              rows={history}
              projectName={projectName}
              supplierName={supplierName}
              onImport={
                canApproveOrImport
                  ? (poId) => {
                      setImportPOId(poId);
                      setImportWarehouseId("");
                      setImportOpen(true);
                    }
                  : undefined
              }
              busyAction={busyAction}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
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
  onImport,
  busyAction,
}: {
  rows: Awaited<ReturnType<typeof purchaseOrdersApi.getAll>>["result"];
  projectName: (id: number) => string;
  supplierName: (id: number) => string;
  onApprove?: (poId: number) => void;
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
              <TableHead className="text-right">Total</TableHead>
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
                  {po.totalAmount.toLocaleString()}
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
                  {po.status === "PENDING" && onApprove && (
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
