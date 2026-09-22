import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { useSession } from "@/lib/session";
import {
  purchaseOrdersApi,
  type PurchaseOrderResponse,
} from "@/api/purchaseOrders";
import { projectsApi } from "@/api/projects";
import { suppliersApi } from "@/api/suppliers";
import { requireApiResult } from "@/api/client";

export const Route = createFileRoute("/app/procurement")({
  head: () => ({ meta: [{ title: "Procurement - BuildSense AI" }] }),
  component: ProcurementPage,
});

function formatMoney(value: number, currency = "VND"): string {
  return `${value.toLocaleString()} ${currency}`;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function ProcurementPage() {
  const session = useSession();
  const isLive = !!session?.token;
  const [selectedPOId, setSelectedPOId] = useState<number | null>(null);

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
  const {
    data: liveShortages,
    isLoading: shortagesLoading,
    isError: shortagesError,
    error: shortagesErrorValue,
    refetch: refetchShortages,
  } = useQuery({
    queryKey: ["purchase-orders", "procurement-shortages"],
    queryFn: async () =>
      requireApiResult(
        await purchaseOrdersApi.getShortages(),
        "Could not load procurement shortages",
      ) ?? [],
    enabled: isLive,
  });

  const projectName = (id: number) =>
    liveProjects?.find((p) => p.projectId === id)?.projectName ?? `Project #${id}`;
  const supplierName = (id: number) =>
    liveSuppliers?.find((s) => s.supplierId === id)?.companyName ?? `Supplier #${id}`;

  const selectedPO: PurchaseOrderResponse | null =
    (livePOs ?? []).find((po) => po.poId === selectedPOId) ?? null;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        section="Operations"
        title="Procurement"
        description="Historical purchase orders and live procurement shortages. Procurement writes are retired — material costs are managed through material requests and warehouse actual-cost accounting."
      />

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Purchase orders ({(livePOs ?? []).length})</TabsTrigger>
          <TabsTrigger value="shortages">
            Shortages ({(liveShortages ?? []).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Purchase order history (read-only)</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Create, approve, reject, receive, ship, processing, and cancel actions return HTTP
                410 Gone. Use material requests for fulfillment.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Loading purchase orders...
                </div>
              ) : isError ? (
                <QueryError
                  message={error instanceof Error ? error.message : undefined}
                  onRetry={() => refetchPOs()}
                />
              ) : (livePOs ?? []).length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No purchase orders on record.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO #</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Order date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(livePOs ?? []).map((po) => (
                      <TableRow key={po.poId}>
                        <TableCell className="font-medium">#{po.poId}</TableCell>
                        <TableCell>{po.projectName || projectName(po.projectId)}</TableCell>
                        <TableCell>{po.supplierName || supplierName(po.supplierId)}</TableCell>
                        <TableCell>{po.warehouseName || `#${po.warehouseId}`}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(po.totalAmount, po.currency)}
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(po.orderDate)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{po.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={() => setSelectedPOId(po.poId)}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shortages">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Procurement shortages (read-only)</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Shortages highlight unfulfilled demand. Orders can no longer be created from
                shortages in the UI.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {shortagesLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Loading shortages...
                </div>
              ) : shortagesError ? (
                <QueryError
                  message={
                    shortagesErrorValue instanceof Error
                      ? shortagesErrorValue.message
                      : undefined
                  }
                  onRetry={() => refetchShortages()}
                />
              ) : (liveShortages ?? []).length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No procurement shortages.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="text-right">Remaining shortage</TableHead>
                      <TableHead>Needed by</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(liveShortages ?? []).map((shortage) => (
                      <TableRow key={`${shortage.requestItemId}-${shortage.variantId}`}>
                        <TableCell className="font-medium">{shortage.projectName}</TableCell>
                        <TableCell>
                          {shortage.materialName}
                          {shortage.variantName && (
                            <p className="text-xs text-muted-foreground">
                              {shortage.variantName}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>{shortage.warehouseName}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {shortage.remainingShortageQuantity.toLocaleString()} {shortage.unit}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(shortage.neededByDate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={selectedPOId !== null} onOpenChange={(open) => !open && setSelectedPOId(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase order #{selectedPO?.poId}</DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
                <POInfo label="Project" value={selectedPO.projectName} />
                <POInfo label="Supplier" value={selectedPO.supplierName} />
                <POInfo
                  label="Warehouse"
                  value={selectedPO.warehouseName || `#${selectedPO.warehouseId}`}
                />
                <POInfo
                  label="Total"
                  value={formatMoney(selectedPO.totalAmount, selectedPO.currency)}
                />
                <POInfo label="Status" value={selectedPO.status} />
                <POInfo label="Order date" value={formatDate(selectedPO.orderDate)} />
                <POInfo
                  label="Expected delivery"
                  value={formatDate(selectedPO.expectedDeliveryDate)}
                />
                {selectedPO.note && <POInfo label="Note" value={selectedPO.note} />}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPO.items.map((item) => (
                    <TableRow key={item.orderLineItemId}>
                      <TableCell className="font-medium">
                        {item.materialName}
                        {item.variantName && (
                          <p className="text-xs text-muted-foreground">{item.variantName}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(item.unitPrice, selectedPO.currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(item.subTotal, selectedPO.currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.receivedQuantity}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPOId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
