import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  Clock3,
  Eye,
  PackageCheck,
  Truck,
  X,
  Calendar,
  MapPin,
  DollarSign,
  Loader2,
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
import {
  purchaseOrdersApi,
  type PurchaseOrderResponse,
  type PurchaseOrderStatus,
} from "@/api/purchaseOrders";
import { requireApiResult } from "@/api/client";
import { useWorkflowSuggestion } from "@/hooks/use-workflow-suggestion";

export const Route = createFileRoute("/app/supplier/orders")({
  head: () => ({ meta: [{ title: "Supplier Orders - BuildSense AI" }] }),
  component: SupplierOrdersPage,
});

function formatMoney(value: number, currency = "VND"): string {
  return `${value.toLocaleString()} ${currency}`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString();
}

function SupplierOrdersPage() {
  const session = useSession();
  const suggestNext = useWorkflowSuggestion();
  const isLive = !!session?.token;
  const isSupplier = session?.role === "SUPPLIER";

  const [selectedPOId, setSelectedPOId] = useState<number | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [processingPOId, setProcessingPOId] = useState<number | null>(null);
  const [shippingPOId, setShippingPOId] = useState<number | null>(null);
  const [statusTab, setStatusTab] = useState<string>("all");

  const {
    data: allPOs,
    refetch: refetchPOs,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["purchase-orders", "supplier"],
    queryFn: async () => {
      const response = await purchaseOrdersApi.getAll();
      return requireApiResult(response, "Could not load purchase orders") ?? [];
    },
    enabled: isLive && isSupplier,
    staleTime: 10_000,
  });

  // Filter POs by supplier (placeholder - need proper supplier ID mapping)
  const supplierPOs = allPOs ?? []; // TODO: Filter by supplier ID when available

  const selectedPO = supplierPOs.find((po) => po.poId === selectedPOId) ?? null;

  const canAcceptProcessing = (po: PurchaseOrderResponse) => {
    return po.status === "APPROVED" || po.status === "PENDING";
  };

  const canMarkShipped = (po: PurchaseOrderResponse) => {
    return po.status === "PROCESSING";
  };

  const acceptProcessing = async (poId: number) => {
    setBusyAction(`processing-${poId}`);
    try {
      const po = supplierPOs.find((item) => item.poId === poId);
      const response = await purchaseOrdersApi.markProcessing(poId, {
        rowVersion: po?.rowVersion,
      });
      if (response.isSuccess) {
        suggestNext({
          message: `PO #${poId} marked as processing`,
          nextStep: "Prepare the order for shipment and mark it as shipped when ready.",
          to: "/app/supplier/orders",
          actionLabel: "View orders",
        });
        await refetchPOs();
      } else {
        toast.error(response.errorMessage ?? "Failed to mark as processing");
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setBusyAction(null);
      setProcessingPOId(null);
    }
  };

  const markShipped = async (poId: number) => {
    setBusyAction(`shipping-${poId}`);
    try {
      const po = supplierPOs.find((item) => item.poId === poId);
      const response = await purchaseOrdersApi.ship(poId, {
        rowVersion: po?.rowVersion,
      });
      if (response.isSuccess) {
        suggestNext({
          message: `PO #${poId} marked as shipped`,
          nextStep: "The warehouse manager will receive the delivery and update inventory.",
          to: "/app/supplier/orders",
          actionLabel: "View orders",
        });
        await refetchPOs();
      } else {
        toast.error(response.errorMessage ?? "Failed to mark as shipped");
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setBusyAction(null);
      setShippingPOId(null);
    }
  };

  const filterPOs = (status: string) => {
    if (status === "all") return supplierPOs;
    if (status === "pending") return supplierPOs.filter((po) => po.status === "PENDING");
    if (status === "approved") return supplierPOs.filter((po) => po.status === "APPROVED");
    if (status === "processing") return supplierPOs.filter((po) => po.status === "PROCESSING");
    if (status === "shipped")
      return supplierPOs.filter((po) => ["SHIPPED", "PARTIALLY_RECEIVED"].includes(po.status));
    if (status === "delivered")
      return supplierPOs.filter((po) => ["DELIVERED", "CLOSED_WITH_VARIANCE"].includes(po.status));
    if (status === "rejected")
      return supplierPOs.filter((po) => ["REJECTED", "CANCELLED"].includes(po.status));
    return supplierPOs;
  };

  const filteredPOs = filterPOs(statusTab);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Supplier"
        title="Purchase Orders"
        description="Manage and track your purchase orders."
      />

      {!isLive ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Sign in with a supplier account to view your orders.
          </CardContent>
        </Card>
      ) : !isSupplier ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            This page is only available for supplier accounts.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Loading orders…
          </CardContent>
        </Card>
      ) : isError ? (
        <QueryError
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetchPOs()}
        />
      ) : (
        <div className="space-y-4">
          <Tabs value={statusTab} onValueChange={setStatusTab}>
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
              <TabsTrigger value="all">All ({supplierPOs.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="processing">Processing</TabsTrigger>
              <TabsTrigger value="shipped">Shipped</TabsTrigger>
              <TabsTrigger value="delivered">Delivered</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value={statusTab} className="mt-4">
              <Card className="shadow-sm">
                <CardContent className="p-0">
                  {filteredPOs.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No orders found for this status.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PO #</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Warehouse</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Order Date</TableHead>
                          <TableHead>Expected Delivery</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPOs.map((po) => {
                          const statusInfo = statusConfig[po.status] || statusConfig.PENDING;
                          return (
                            <TableRow key={po.poId}>
                              <TableCell className="font-medium">#{po.poId}</TableCell>
                              <TableCell>{po.projectName}</TableCell>
                              <TableCell>{po.warehouseName}</TableCell>
                              <TableCell>{po.items.length}</TableCell>
                              <TableCell>{formatMoney(po.totalAmount)}</TableCell>
                              <TableCell>{formatDate(po.orderDate)}</TableCell>
                              <TableCell>{formatDate(po.expectedDeliveryDate)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    statusInfo.variant as
                                      | "default"
                                      | "secondary"
                                      | "destructive"
                                      | "outline"
                                  }
                                  className="text-xs"
                                >
                                  {statusInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setSelectedPOId(po.poId)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {canAcceptProcessing(po) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs"
                                      onClick={() => setProcessingPOId(po.poId)}
                                      disabled={busyAction === `processing-${po.poId}`}
                                    >
                                      {busyAction === `processing-${po.poId}` ? (
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      ) : (
                                        <Check className="h-3 w-3 mr-1" />
                                      )}
                                      Accept
                                    </Button>
                                  )}
                                  {canMarkShipped(po) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs"
                                      onClick={() => setShippingPOId(po.poId)}
                                      disabled={busyAction === `shipping-${po.poId}`}
                                    >
                                      {busyAction === `shipping-${po.poId}` ? (
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      ) : (
                                        <Truck className="h-3 w-3 mr-1" />
                                      )}
                                      Ship
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* PO Detail Dialog */}
      <Dialog open={selectedPOId !== null} onOpenChange={() => setSelectedPOId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order #{selectedPO?.poId}</DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Order Date:</span>
                    <span className="font-medium">{formatDate(selectedPO.orderDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Expected Delivery:</span>
                    <span className="font-medium">
                      {formatDate(selectedPO.expectedDeliveryDate)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Warehouse:</span>
                    <span className="font-medium">{selectedPO.warehouseName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium">{formatMoney(selectedPO.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {selectedPO.note && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-1">Note:</p>
                  <p className="text-sm text-muted-foreground">{selectedPO.note}</p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-3">Order Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPO.items.map((item) => (
                      <TableRow key={item.orderLineItemId}>
                        <TableCell className="font-medium">{item.materialName}</TableCell>
                        <TableCell>{item.variantName}</TableCell>
                        <TableCell>
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell>{formatMoney(item.unitPrice)}</TableCell>
                        <TableCell>{formatMoney(item.subTotal)}</TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div>Received: {item.receivedQuantity}</div>
                            <div>Remaining: {item.remainingQuantity}</div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPOId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Processing Dialog */}
      <ConfirmDialog
        open={processingPOId !== null}
        onOpenChange={() => setProcessingPOId(null)}
        onConfirm={() => processingPOId && acceptProcessing(processingPOId)}
        title="Accept Order for Processing"
        description="Are you sure you want to mark this purchase order as processing? This indicates you have begun working on the order."
        confirmText="Accept Processing"
      />

      {/* Confirm Shipping Dialog */}
      <ConfirmDialog
        open={shippingPOId !== null}
        onOpenChange={() => setShippingPOId(null)}
        onConfirm={() => shippingPOId && markShipped(shippingPOId)}
        title="Mark Order as Shipped"
        description="Are you sure you want to mark this purchase order as shipped? This indicates the goods have been dispatched to the warehouse."
        confirmText="Mark as Shipped"
      />
    </div>
  );
}
