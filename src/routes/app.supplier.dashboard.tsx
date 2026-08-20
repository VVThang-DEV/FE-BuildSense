import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Clock3,
  PackageCheck,
  Truck,
  X,
  CircleDollarSign,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { cn, statusConfig } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { purchaseOrdersApi, type PurchaseOrderResponse } from "@/api/purchaseOrders";
import { requireApiResult } from "@/api/client";

export const Route = createFileRoute("/app/supplier/dashboard")({
  head: () => ({ meta: [{ title: "Supplier Dashboard - BuildSense AI" }] }),
  component: SupplierDashboardPage,
});

function formatMoney(value: number, currency = "VND"): string {
  return `${value.toLocaleString()} ${currency}`;
}

function SupplierDashboardPage() {
  const session = useSession();
  const isLive = !!session?.token;
  const isSupplier = session?.role === "SUPPLIER";

  const {
    data: allPOs,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["purchase-orders", "supplier"],
    queryFn: async () => {
      const response = await purchaseOrdersApi.getAll();
      return requireApiResult(response, "Could not load purchase orders") ?? [];
    },
    enabled: isLive && isSupplier,
    staleTime: 10_000,
  });

  // Filter POs by supplier (we'll need to determine supplier ID from session)
  // For now, this is a placeholder - we'll need to implement proper supplier ID mapping
  const supplierPOs = allPOs ?? []; // TODO: Filter by supplier ID when available

  const pending = supplierPOs.filter((po) => po.status === "PENDING");
  const approved = supplierPOs.filter((po) => po.status === "APPROVED");
  const processing = supplierPOs.filter((po) => po.status === "PROCESSING");
  const shipped = supplierPOs.filter((po) => ["SHIPPED", "PARTIALLY_RECEIVED"].includes(po.status));
  const delivered = supplierPOs.filter((po) =>
    ["DELIVERED", "CLOSED_WITH_VARIANCE"].includes(po.status),
  );
  const rejected = supplierPOs.filter((po) => ["REJECTED", "CANCELLED"].includes(po.status));

  const activeOrders = approved.length + processing.length + shipped.length;
  const pipelineValue = supplierPOs
    .filter(
      (po) => !["DELIVERED", "CLOSED_WITH_VARIANCE", "REJECTED", "CANCELLED"].includes(po.status),
    )
    .reduce((sum, po) => sum + po.totalAmount, 0);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Supplier"
        title="Supplier Dashboard"
        description="Overview of your purchase orders and delivery status."
        actions={
          isLive && isSupplier ? (
            <Button size="sm" className="h-8 text-xs" asChild>
              <Link to="/app/supplier/orders">
                View All Orders
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          ) : undefined
        }
      />

      {!isLive ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Sign in with a supplier account to view your dashboard.
          </CardContent>
        </Card>
      ) : !isSupplier ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            This dashboard is only available for supplier accounts.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Loading dashboard…
          </CardContent>
        </Card>
      ) : isError ? (
        <QueryError
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      ) : (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={Clock3}
              label="Pending Approval"
              value={pending.length}
              color="warning"
            />
            <MetricCard
              icon={ShoppingCart}
              label="Active Orders"
              value={activeOrders}
              color="primary"
            />
            <MetricCard
              icon={PackageCheck}
              label="Completed"
              value={delivered.length}
              color="success"
            />
            <MetricCard
              icon={CircleDollarSign}
              label="Pipeline Value"
              value={formatMoney(pipelineValue)}
              color="ai"
            />
          </div>

          {/* Recent Orders */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {supplierPOs.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No purchase orders found.
                </div>
              ) : (
                <div className="space-y-3">
                  {supplierPOs.slice(0, 5).map((po) => (
                    <OrderRow key={po.poId} po={po} />
                  ))}
                  {supplierPOs.length > 5 && (
                    <div className="pt-2 text-center">
                      <Button size="sm" variant="ghost" className="text-xs" asChild>
                        <Link to="/app/supplier/orders">
                          View all {supplierPOs.length} orders
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatusCard
              title="Needs Action"
              count={approved.length}
              description="Orders approved and ready for processing"
              actionLabel="View Orders"
              actionTo="/app/supplier/orders"
              color="warning"
            />
            <StatusCard
              title="In Progress"
              count={processing.length + shipped.length}
              description="Orders being processed or shipped"
              actionLabel="View Orders"
              actionTo="/app/supplier/orders"
              color="primary"
            />
            <StatusCard
              title="Completed"
              count={delivered.length}
              description="Orders successfully delivered"
              actionLabel="View Orders"
              actionTo="/app/supplier/orders"
              color="success"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: "primary" | "success" | "warning" | "destructive" | "ai";
}) {
  const colorClasses = {
    primary: "text-primary bg-primary/10",
    success: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950",
    warning: "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950",
    destructive: "text-destructive bg-destructive/10",
    ai: "text-ai bg-ai/10",
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div
            className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center",
              colorClasses[color],
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OrderRow({ po }: { po: PurchaseOrderResponse }) {
  const statusInfo = statusConfig[po.status] || statusConfig.PENDING;

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm font-medium">PO #{po.poId}</p>
          <p className="text-xs text-muted-foreground">{po.projectName}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium">{formatMoney(po.totalAmount)}</p>
          <p className="text-xs text-muted-foreground">{po.items.length} items</p>
        </div>
        <Badge className={cn("text-xs", statusInfo.cls)}>
          {statusInfo.label}
        </Badge>
      </div>
    </div>
  );
}

function StatusCard({
  title,
  count,
  description,
  actionLabel,
  actionTo,
  color,
}: {
  title: string;
  count: number;
  description: string;
  actionLabel: string;
  actionTo: string;
  color: "primary" | "success" | "warning" | "destructive" | "ai";
}) {
  const colorClasses = {
    primary: "border-primary/20 bg-primary/5",
    success: "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950",
    warning: "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950",
    destructive: "border-destructive/20 bg-destructive/5",
    ai: "border-ai/20 bg-ai/5",
  };

  return (
    <Card className={cn("shadow-sm", colorClasses[color])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-sm font-medium mt-1">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
        {count > 0 && (
          <Button size="sm" variant="ghost" className="mt-3 text-xs h-7" asChild>
            <Link to={actionTo}>{actionLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
