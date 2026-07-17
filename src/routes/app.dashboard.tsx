import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FolderKanban,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { cn, healthConfig, statusConfig } from "@/lib/utils";
import { ROLE_LABELS, useSession, type Role } from "@/lib/session";
import { projectsApi, type ProjectResponse } from "@/api/projects";
import { materialsApi } from "@/api/materials";
import { suppliersApi } from "@/api/suppliers";
import { warehousesApi, type InventoryItem, type WarehouseResponse } from "@/api/warehouses";
import { purchaseOrdersApi, type PurchaseOrderResponse } from "@/api/purchaseOrders";
import { usersApi } from "@/api/users";
import { requireApiResult } from "@/api/client";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - BuildSense AI" }] }),
  component: DashboardPage,
});

type InventoryRow = InventoryItem & {
  warehouseId: number;
  warehouseName: string;
};

const PROJECT_STATUS_HEALTH: Record<ProjectResponse["status"], keyof typeof healthConfig> = {
  PLANNING: "on-track",
  IN_PROGRESS: "on-track",
  COMPLETED: "on-track",
  DELAYED: "delayed",
  PAUSED: "at-risk",
  CANCELLED: "at-risk",
};

const CHART_COLORS = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  ai: "var(--ai)",
  muted: "var(--muted-foreground)",
};

const PROJECT_CHART_CONFIG = {
  count: { label: "Projects", color: CHART_COLORS.primary },
} satisfies ChartConfig;

const PO_CHART_CONFIG = {
  count: { label: "Orders", color: CHART_COLORS.primary },
  value: { label: "Value", color: CHART_COLORS.success },
} satisfies ChartConfig;

const STOCK_CHART_CONFIG = {
  quantity: { label: "Available", color: CHART_COLORS.primary },
  reorderLevel: { label: "Reorder level", color: CHART_COLORS.warning },
} satisfies ChartConfig;

const BUDGET_CHART_CONFIG = {
  budget: { label: "Budget", color: CHART_COLORS.primary },
  poValue: { label: "PO value", color: CHART_COLORS.warning },
} satisfies ChartConfig;

function DashboardPage() {
  const session = useSession();
  const role = session?.role ?? "CUSTOMER";
  const isLive = !!session?.token;
  const canSeeProjects = role === "ADMIN" || role === "PM";
  const canSeeWarehouse = role === "ADMIN" || role === "WAREHOUSE_MANAGER";
  const canSeeSuppliers = role === "ADMIN";
  const canSeeUsers = role === "ADMIN";

  const projectsQuery = useQuery({
    queryKey: ["dashboard-projects"],
    queryFn: async () =>
      requireApiResult(await projectsApi.getAll(), "Could not load projects") ?? [],
    enabled: isLive && canSeeProjects,
    staleTime: 30_000,
  });
  const { data: projects = [], isLoading: projectsLoading } = projectsQuery;

  const materialsQuery = useQuery({
    queryKey: ["dashboard-materials"],
    queryFn: async () =>
      requireApiResult(await materialsApi.getAll(), "Could not load materials") ?? [],
    enabled: isLive && role !== "CUSTOMER" && role !== "SUPPLIER",
    staleTime: 30_000,
  });
  const { data: materials = [] } = materialsQuery;

  const suppliersQuery = useQuery({
    queryKey: ["dashboard-suppliers"],
    queryFn: async () =>
      requireApiResult(await suppliersApi.getAll(), "Could not load suppliers") ?? [],
    enabled: isLive && canSeeSuppliers,
    staleTime: 30_000,
  });
  const { data: suppliers = [] } = suppliersQuery;

  const warehousesQuery = useQuery({
    queryKey: ["dashboard-warehouses"],
    queryFn: async () =>
      requireApiResult(await warehousesApi.getAll(), "Could not load warehouses") ?? [],
    enabled: isLive && canSeeWarehouse,
    staleTime: 30_000,
  });
  const { data: warehouses = [] } = warehousesQuery;

  const inventoryQuery = useQuery({
    queryKey: [
      "dashboard-inventory",
      warehouses.map((warehouse) => warehouse.warehouseId).join(","),
    ],
    queryFn: async () => {
      const rows = await Promise.all(
        warehouses.map(async (warehouse) => {
          const response = await warehousesApi.getInventory(warehouse.warehouseId);
          return (
            requireApiResult(response, `Could not load ${warehouse.warehouseName} inventory`) ?? []
          ).map((item) => ({
            ...item,
            warehouseId: warehouse.warehouseId,
            warehouseName: item.warehouseName ?? warehouse.warehouseName,
          }));
        }),
      );
      return rows.flat();
    },
    enabled: isLive && canSeeWarehouse && warehouses.length > 0,
    staleTime: 20_000,
  });
  const { data: inventory = [], isLoading: inventoryLoading } = inventoryQuery;

  const purchaseOrdersQuery = useQuery({
    queryKey: ["dashboard-purchase-orders"],
    queryFn: async () =>
      requireApiResult(await purchaseOrdersApi.getAll(), "Could not load purchase orders") ?? [],
    enabled: isLive && role !== "CUSTOMER" && role !== "SUPPLIER",
    staleTime: 20_000,
  });
  const { data: purchaseOrders = [], isLoading: purchaseOrdersLoading } = purchaseOrdersQuery;

  const userCountQuery = useQuery({
    queryKey: ["dashboard-user-count"],
    queryFn: async () =>
      requireApiResult(await usersApi.countUsers(), "Could not load user count") ?? 0,
    enabled: isLive && canSeeUsers,
    staleTime: 60_000,
  });
  const { data: userCount = 0 } = userCountQuery;

  const failedQuery = [
    projectsQuery,
    materialsQuery,
    suppliersQuery,
    warehousesQuery,
    inventoryQuery,
    purchaseOrdersQuery,
    userCountQuery,
  ].find((query) => query.isError);

  const scopedProjects = useMemo(() => {
    if (role !== "PM" || !session?.userId) return projects;
    return projects.filter((project) => project.pmUserID === session.userId);
  }, [projects, role, session?.userId]);

  const scopedProjectIds = useMemo(
    () => new Set(scopedProjects.map((project) => project.projectId)),
    [scopedProjects],
  );

  const scopedPurchaseOrders = useMemo(() => {
    if (role !== "PM") return purchaseOrders;
    return purchaseOrders.filter((po) => scopedProjectIds.has(po.projectId));
  }, [purchaseOrders, role, scopedProjectIds]);

  const pendingPOs = scopedPurchaseOrders.filter((po) => po.status === "PENDING");
  const approvedPOs = scopedPurchaseOrders.filter((po) => po.status === "APPROVED");
  const deliveredPOs = scopedPurchaseOrders.filter((po) => po.status === "DELIVERED");
  const lowStockRows = inventory.filter((item) => item.isLowStock);

  if (!isLive) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <PageHeader
          section="Overview"
          title="Dashboard"
          description="Sign in with a backend account to load live operational data."
        />
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Dashboard metrics require an authenticated backend session.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        section="Overview"
        title={`${ROLE_LABELS[role]} Dashboard`}
        description={dashboardDescription(role)}
      />

      {failedQuery && (
        <Card className="shadow-sm">
          <QueryError
            message={failedQuery.error instanceof Error ? failedQuery.error.message : undefined}
            onRetry={() => {
              projectsQuery.refetch();
              materialsQuery.refetch();
              suppliersQuery.refetch();
              warehousesQuery.refetch();
              inventoryQuery.refetch();
              purchaseOrdersQuery.refetch();
              userCountQuery.refetch();
            }}
          />
        </Card>
      )}

      {!failedQuery && role === "ADMIN" && (
        <AdminDashboard
          projects={projects}
          materialsCount={materials.length}
          suppliersCount={suppliers.length}
          warehouses={warehouses}
          inventory={inventory}
          lowStockRows={lowStockRows}
          purchaseOrders={purchaseOrders}
          pendingPOs={pendingPOs}
          approvedPOs={approvedPOs}
          deliveredPOs={deliveredPOs}
          userCount={userCount}
          loading={projectsLoading || purchaseOrdersLoading || inventoryLoading}
        />
      )}

      {!failedQuery && role === "PM" && (
        <ProjectManagerDashboard
          projects={scopedProjects}
          purchaseOrders={scopedPurchaseOrders}
          pendingPOs={pendingPOs}
          approvedPOs={approvedPOs}
          deliveredPOs={deliveredPOs}
          loading={projectsLoading || purchaseOrdersLoading}
        />
      )}

      {!failedQuery && role === "WAREHOUSE_MANAGER" && (
        <WarehouseManagerDashboard
          warehouses={warehouses}
          inventory={inventory}
          lowStockRows={lowStockRows}
          purchaseOrders={purchaseOrders}
          pendingPOs={pendingPOs}
          approvedPOs={approvedPOs}
          deliveredPOs={deliveredPOs}
          materialsCount={materials.length}
          loading={purchaseOrdersLoading || inventoryLoading}
        />
      )}

      {!failedQuery && (role === "SUPPLIER" || role === "CUSTOMER") && (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Dashboard views are currently implemented for Admin, Project Manager, and Warehouse
            Manager.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AdminDashboard({
  projects,
  materialsCount,
  suppliersCount,
  warehouses,
  inventory,
  lowStockRows,
  purchaseOrders,
  pendingPOs,
  approvedPOs,
  deliveredPOs,
  userCount,
  loading,
}: {
  projects: ProjectResponse[];
  materialsCount: number;
  suppliersCount: number;
  warehouses: WarehouseResponse[];
  inventory: InventoryRow[];
  lowStockRows: InventoryRow[];
  purchaseOrders: PurchaseOrderResponse[];
  pendingPOs: PurchaseOrderResponse[];
  approvedPOs: PurchaseOrderResponse[];
  deliveredPOs: PurchaseOrderResponse[];
  userCount: number;
  loading: boolean;
}) {
  const activeProjects = projects.filter((project) => project.status !== "COMPLETED").length;
  return (
    <>
      <MetricGrid>
        <MetricCard
          icon={FolderKanban}
          label="Active projects"
          value={activeProjects}
          detail={`${projects.length} total`}
          to="/app/projects"
        />
        <MetricCard
          icon={Users}
          label="Users"
          value={userCount}
          detail="Managed accounts"
          to="/app/staff/users"
        />
        <MetricCard
          icon={Package}
          label="Materials"
          value={materialsCount}
          detail={`${lowStockRows.length} low stock`}
          to="/app/materials"
        />
        <MetricCard
          icon={ShoppingCart}
          label="Pending POs"
          value={pendingPOs.length}
          detail={formatMoney(sumPOs(pendingPOs))}
          to="/app/procurement"
          tone={pendingPOs.length ? "warning" : "default"}
        />
        <MetricCard
          icon={Warehouse}
          label="Warehouses"
          value={warehouses.length}
          detail={`${inventory.length} stock records`}
          to="/app/admin/warehouses"
        />
        <MetricCard
          icon={Truck}
          label="Suppliers"
          value={suppliersCount}
          detail="Supplier records"
          to="/app/admin/suppliers"
        />
      </MetricGrid>

      <div className="grid gap-4 xl:grid-cols-2">
        <ProjectStatusChartPanel projects={projects} loading={loading} />
        <ProcurementDonutPanel
          pendingPOs={pendingPOs}
          approvedPOs={approvedPOs}
          deliveredPOs={deliveredPOs}
        />
        <PurchaseOrderValueChartPanel purchaseOrders={purchaseOrders} />
        <WarehouseStockChartPanel inventory={inventory} loading={loading} />
        <LowStockPanel rows={lowStockRows} />
        <RecentPOPanel purchaseOrders={purchaseOrders} />
      </div>
    </>
  );
}

function ProjectManagerDashboard({
  projects,
  purchaseOrders,
  pendingPOs,
  approvedPOs,
  deliveredPOs,
  loading,
}: {
  projects: ProjectResponse[];
  purchaseOrders: PurchaseOrderResponse[];
  pendingPOs: PurchaseOrderResponse[];
  approvedPOs: PurchaseOrderResponse[];
  deliveredPOs: PurchaseOrderResponse[];
  loading: boolean;
}) {
  const activeProjects = projects.filter((project) => project.status !== "COMPLETED").length;
  const delayedProjects = projects.filter((project) => project.status === "DELAYED").length;
  const totalBudget = projects.reduce((sum, project) => sum + project.totalProjectBudget, 0);
  return (
    <>
      <MetricGrid>
        <MetricCard
          icon={FolderKanban}
          label="My active projects"
          value={activeProjects}
          detail={`${projects.length} assigned`}
          to="/app/projects"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Delayed projects"
          value={delayedProjects}
          detail="Needs review"
          tone={delayedProjects ? "danger" : "default"}
        />
        <MetricCard
          icon={Clock3}
          label="POs awaiting approval"
          value={pendingPOs.length}
          detail="With warehouse"
          to="/app/procurement"
          tone={pendingPOs.length ? "warning" : "default"}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Approved POs"
          value={approvedPOs.length}
          detail={`${deliveredPOs.length} delivered`}
          to="/app/procurement"
        />
        <MetricCard
          icon={CircleDollarSign}
          label="Project budget"
          value={formatMoneyCompact(totalBudget)}
          detail={`${formatMoney(totalBudget)} recorded`}
        />
        <MetricCard
          icon={ShoppingCart}
          label="PO value"
          value={formatMoneyCompact(sumPOs(purchaseOrders))}
          detail={`${purchaseOrders.length} orders`}
          to="/app/procurement"
        />
      </MetricGrid>

      <div className="grid gap-4 xl:grid-cols-2">
        <ProjectBudgetChartPanel projects={projects} purchaseOrders={purchaseOrders} />
        <ProcurementDonutPanel
          pendingPOs={pendingPOs}
          approvedPOs={approvedPOs}
          deliveredPOs={deliveredPOs}
        />
        <ProjectListPanel projects={projects} loading={loading} />
        <POAttentionPanel pendingPOs={pendingPOs} approvedPOs={approvedPOs} />
      </div>
    </>
  );
}

function WarehouseManagerDashboard({
  warehouses,
  inventory,
  lowStockRows,
  purchaseOrders,
  pendingPOs,
  approvedPOs,
  deliveredPOs,
  materialsCount,
  loading,
}: {
  warehouses: WarehouseResponse[];
  inventory: InventoryRow[];
  lowStockRows: InventoryRow[];
  purchaseOrders: PurchaseOrderResponse[];
  pendingPOs: PurchaseOrderResponse[];
  approvedPOs: PurchaseOrderResponse[];
  deliveredPOs: PurchaseOrderResponse[];
  materialsCount: number;
  loading: boolean;
}) {
  return (
    <>
      <MetricGrid>
        <MetricCard
          icon={Warehouse}
          label="Warehouses"
          value={warehouses.length}
          detail={`${inventory.length} stock records`}
          to="/app/admin/warehouses"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Low stock"
          value={lowStockRows.length}
          detail="Needs replenishment"
          tone={lowStockRows.length ? "danger" : "default"}
          to="/app/admin/warehouses"
        />
        <MetricCard
          icon={Clock3}
          label="POs to approve"
          value={pendingPOs.length}
          detail={formatMoney(sumPOs(pendingPOs))}
          tone={pendingPOs.length ? "warning" : "default"}
          to="/app/procurement"
        />
        <MetricCard
          icon={Boxes}
          label="Ready to import"
          value={approvedPOs.length}
          detail="Approved POs"
          tone={approvedPOs.length ? "warning" : "default"}
          to="/app/procurement"
        />
        <MetricCard
          icon={Package}
          label="Material catalog"
          value={materialsCount}
          detail="Known materials"
          to="/app/materials"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Delivered POs"
          value={deliveredPOs.length}
          detail={`${purchaseOrders.length} total orders`}
        />
      </MetricGrid>

      <div className="grid gap-4 xl:grid-cols-2">
        <WarehouseStockChartPanel inventory={inventory} loading={loading} />
        <LowStockRiskChartPanel rows={lowStockRows} />
        <POActionPanel pendingPOs={pendingPOs} approvedPOs={approvedPOs} />
        <ProcurementDonutPanel
          pendingPOs={pendingPOs}
          approvedPOs={approvedPOs}
          deliveredPOs={deliveredPOs}
        />
        <WarehouseInventoryPanel warehouses={warehouses} inventory={inventory} loading={loading} />
      </div>
    </>
  );
}

function MetricGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{children}</div>;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  to,
  tone = "default",
}: {
  icon: typeof FolderKanban;
  label: string;
  value: string | number;
  detail: string;
  to?: string;
  tone?: "default" | "warning" | "danger";
}) {
  const content = (
    <Card className="h-full overflow-hidden shadow-sm transition-colors hover:border-primary/35">
      <div
        className={cn(
          "h-1",
          tone === "danger" && "bg-destructive",
          tone === "warning" && "bg-warning",
          tone === "default" && "bg-primary",
        )}
      />
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="min-h-[2rem] pr-2 text-xs leading-4 text-muted-foreground">{label}</p>
            <p className="mt-1 break-words text-[1.35rem] font-semibold leading-7 tabular-nums">
              {value}
            </p>
          </div>
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
              tone === "danger" && "border-destructive/30 bg-destructive/10 text-destructive",
              tone === "warning" && "border-warning/35 bg-warning/15 text-warning-foreground",
              tone === "default" && "border-primary/20 bg-primary/10 text-primary",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-3 truncate text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function ProjectStatusChartPanel({
  projects,
  loading,
}: {
  projects: ProjectResponse[];
  loading: boolean;
}) {
  const data = (
    ["PLANNING", "IN_PROGRESS", "DELAYED", "COMPLETED"] as ProjectResponse["status"][]
  ).map((status) => ({
    status,
    label: status.replace("_", " "),
    count: projects.filter((project) => project.status === status).length,
    fill:
      status === "DELAYED"
        ? CHART_COLORS.destructive
        : status === "COMPLETED"
          ? CHART_COLORS.success
          : status === "IN_PROGRESS"
            ? CHART_COLORS.primary
            : CHART_COLORS.ai,
  }));

  return (
    <Panel
      title="Project Analytics"
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/app/projects">Open</Link>
        </Button>
      }
    >
      {loading ? (
        <LoadingLine />
      ) : projects.length === 0 ? (
        <EmptyLine>No projects found.</EmptyLine>
      ) : (
        <div className="rounded-lg border bg-muted/20 p-3">
          <ChartContainer config={PROJECT_CHART_CONFIG} className="h-[270px] w-full !aspect-auto">
            <BarChart data={data} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={84}>
                {data.map((entry) => (
                  <Cell key={entry.status} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </Panel>
  );
}

function ProcurementDonutPanel({
  pendingPOs,
  approvedPOs,
  deliveredPOs,
}: {
  pendingPOs: PurchaseOrderResponse[];
  approvedPOs: PurchaseOrderResponse[];
  deliveredPOs: PurchaseOrderResponse[];
}) {
  const data = [
    {
      status: "Pending",
      count: pendingPOs.length,
      value: sumPOs(pendingPOs),
      fill: CHART_COLORS.warning,
    },
    {
      status: "Approved",
      count: approvedPOs.length,
      value: sumPOs(approvedPOs),
      fill: CHART_COLORS.primary,
    },
    {
      status: "Delivered",
      count: deliveredPOs.length,
      value: sumPOs(deliveredPOs),
      fill: CHART_COLORS.success,
    },
  ];
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Panel
      title="Procurement Mix"
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/app/procurement">Open</Link>
        </Button>
      }
    >
      {total === 0 ? (
        <EmptyLine>No purchase orders yet.</EmptyLine>
      ) : (
        <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_230px]">
          <div className="relative min-w-0 rounded-lg border bg-muted/20 p-3">
            <ChartContainer config={PO_CHART_CONFIG} className="h-[260px] w-full !aspect-auto">
              <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="status"
                      hideLabel
                      formatter={(value, name, item) => (
                        <div className="flex min-w-[150px] items-center justify-between gap-4">
                          <span className="text-muted-foreground">{name}</span>
                          <span className="font-mono font-medium">
                            {Number(value).toLocaleString()}
                          </span>
                          {"payload" in item &&
                          typeof item.payload === "object" &&
                          item.payload &&
                          "value" in item.payload ? (
                            <span className="text-muted-foreground">
                              {formatMoney(Number(item.payload.value))}
                            </span>
                          ) : null}
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={68}
                  outerRadius={98}
                  paddingAngle={4}
                  cornerRadius={8}
                  strokeWidth={2}
                >
                  {data.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-semibold tabular-nums">{total}</p>
                <p className="text-xs text-muted-foreground">total POs</p>
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            {data.map((item) => (
              <div key={item.status} className="rounded-md border bg-card px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.fill }} />
                  <span className="text-sm font-medium">{item.status}</span>
                  <span className="ml-auto font-mono text-sm font-semibold">{item.count}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(item.count / total) * 100}%`, backgroundColor: item.fill }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{formatMoney(item.value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

function PurchaseOrderValueChartPanel({
  purchaseOrders,
}: {
  purchaseOrders: PurchaseOrderResponse[];
}) {
  const data = [...purchaseOrders]
    .sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime())
    .slice(-8)
    .map((po) => ({
      label: `#${po.poId}`,
      value: po.totalAmount,
    }));

  return (
    <Panel title="PO Value Trend">
      {data.length === 0 ? (
        <EmptyLine>No purchase-order value to chart yet.</EmptyLine>
      ) : (
        <div className="rounded-lg border bg-muted/20 p-3">
          <ChartContainer config={PO_CHART_CONFIG} className="h-[270px] w-full !aspect-auto">
            <AreaChart data={data} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="poValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={shortNumber}
                width={42}
              />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-value)"
                fill="url(#poValue)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      )}
    </Panel>
  );
}

function ProjectBudgetChartPanel({
  projects,
  purchaseOrders,
}: {
  projects: ProjectResponse[];
  purchaseOrders: PurchaseOrderResponse[];
}) {
  const data = projects.slice(0, 6).map((project) => ({
    name: compactLabel(project.projectName),
    budget: project.totalProjectBudget,
    poValue: sumPOs(purchaseOrders.filter((po) => po.projectId === project.projectId)),
  }));

  return (
    <Panel title="Budget vs PO Value">
      {data.length === 0 ? (
        <EmptyLine>No project budget data yet.</EmptyLine>
      ) : (
        <div className="rounded-lg border bg-muted/20 p-3">
          <ChartContainer config={BUDGET_CHART_CONFIG} className="h-[290px] w-full !aspect-auto">
            <BarChart data={data} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={shortNumber}
                width={42}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="budget"
                fill="var(--color-budget)"
                radius={[8, 8, 0, 0]}
                maxBarSize={58}
              />
              <Bar
                dataKey="poValue"
                fill="var(--color-poValue)"
                radius={[8, 8, 0, 0]}
                maxBarSize={58}
              />
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </Panel>
  );
}

function WarehouseStockChartPanel({
  inventory,
  loading,
}: {
  inventory: InventoryRow[];
  loading: boolean;
}) {
  const data = [...inventory]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8)
    .map((item) => ({
      name: compactLabel(item.material?.materialName ?? `Material #${item.materialId}`),
      quantity: item.quantity,
    }));

  return (
    <Panel
      title="Warehouse Stock Analytics"
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/app/admin/warehouses">Open</Link>
        </Button>
      }
    >
      {loading ? (
        <LoadingLine />
      ) : data.length === 0 ? (
        <EmptyLine>No inventory records found.</EmptyLine>
      ) : (
        <div className="rounded-lg border bg-muted/20 p-3">
          <ChartContainer config={STOCK_CHART_CONFIG} className="h-[320px] w-full !aspect-auto">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 16, left: 8, bottom: 5 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="4 4" />
              <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={shortNumber} />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={105}
              />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="quantity" fill="var(--color-quantity)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </Panel>
  );
}

function LowStockRiskChartPanel({ rows }: { rows: InventoryRow[] }) {
  const data = rows.slice(0, 8).map((item) => ({
    name: compactLabel(item.material?.materialName ?? `Material #${item.materialId}`),
    quantity: item.quantity,
    reorderLevel: item.reorderLevel,
  }));

  return (
    <Panel title="Low-stock Risk">
      {data.length === 0 ? (
        <EmptyLine>No low-stock materials detected from current inventory records.</EmptyLine>
      ) : (
        <div className="rounded-lg border bg-muted/20 p-3">
          <ChartContainer config={STOCK_CHART_CONFIG} className="h-[310px] w-full !aspect-auto">
            <BarChart data={data} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={shortNumber} width={42} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="quantity"
                fill="var(--color-quantity)"
                radius={[8, 8, 0, 0]}
                maxBarSize={58}
              />
              <Bar
                dataKey="reorderLevel"
                fill="var(--color-reorderLevel)"
                radius={[8, 8, 0, 0]}
                maxBarSize={58}
              />
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </Panel>
  );
}

function ProjectStatusPanel({
  projects,
  loading,
}: {
  projects: ProjectResponse[];
  loading: boolean;
}) {
  const statuses: ProjectResponse["status"][] = ["PLANNING", "IN_PROGRESS", "DELAYED", "COMPLETED"];
  return (
    <Panel
      title="Project Status"
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/app/projects">Open</Link>
        </Button>
      }
    >
      {loading ? (
        <LoadingLine />
      ) : projects.length === 0 ? (
        <EmptyLine>No projects found.</EmptyLine>
      ) : (
        <div className="space-y-3">
          {statuses.map((status) => {
            const count = projects.filter((project) => project.status === status).length;
            return (
              <div key={status} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{status.replace("_", " ")}</span>
                  <Badge
                    variant="outline"
                    className={cn(healthConfig[PROJECT_STATUS_HEALTH[status]].cls)}
                  >
                    {count}
                  </Badge>
                </div>
                <ProgressBar value={projects.length ? (count / projects.length) * 100 : 0} />
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function ProcurementPanel({
  pendingPOs,
  approvedPOs,
  deliveredPOs,
  purchaseOrders,
}: {
  pendingPOs: PurchaseOrderResponse[];
  approvedPOs: PurchaseOrderResponse[];
  deliveredPOs: PurchaseOrderResponse[];
  purchaseOrders: PurchaseOrderResponse[];
}) {
  const total = purchaseOrders.length;
  return (
    <Panel
      title="Procurement Summary"
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/app/procurement">Open</Link>
        </Button>
      }
    >
      {total === 0 ? (
        <EmptyLine>No purchase orders yet.</EmptyLine>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatusBox
            label="Pending"
            count={pendingPOs.length}
            value={sumPOs(pendingPOs)}
            status="pending"
          />
          <StatusBox
            label="Approved"
            count={approvedPOs.length}
            value={sumPOs(approvedPOs)}
            status="approved"
          />
          <StatusBox
            label="Delivered"
            count={deliveredPOs.length}
            value={sumPOs(deliveredPOs)}
            status="delivered"
          />
        </div>
      )}
    </Panel>
  );
}

function ProjectListPanel({
  projects,
  loading,
}: {
  projects: ProjectResponse[];
  loading: boolean;
}) {
  return (
    <Panel title="Projects Needing Attention">
      {loading ? (
        <LoadingLine />
      ) : projects.length === 0 ? (
        <EmptyLine>No assigned projects found.</EmptyLine>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Baseline end</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.slice(0, 5).map((project) => (
              <TableRow key={project.projectId}>
                <TableCell className="font-medium">
                  <Link
                    to="/app/projects/$id"
                    params={{ id: String(project.projectId) }}
                    className="hover:underline"
                  >
                    {project.projectName}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(healthConfig[PROJECT_STATUS_HEALTH[project.status]].cls)}
                  >
                    {project.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(project.baselineEnd)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}

function POAttentionPanel({
  pendingPOs,
  approvedPOs,
}: {
  pendingPOs: PurchaseOrderResponse[];
  approvedPOs: PurchaseOrderResponse[];
}) {
  const rows = [...pendingPOs, ...approvedPOs].slice(0, 5);
  return (
    <Panel title="PO Follow-up">
      {rows.length === 0 ? (
        <EmptyLine>No pending or approved POs for your projects.</EmptyLine>
      ) : (
        <PurchaseOrderTable rows={rows} />
      )}
    </Panel>
  );
}

function POActionPanel({
  pendingPOs,
  approvedPOs,
}: {
  pendingPOs: PurchaseOrderResponse[];
  approvedPOs: PurchaseOrderResponse[];
}) {
  const rows = [...pendingPOs, ...approvedPOs].slice(0, 6);
  return (
    <Panel
      title="Warehouse PO Queue"
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/app/procurement">Act</Link>
        </Button>
      }
    >
      {rows.length === 0 ? (
        <EmptyLine>No POs awaiting warehouse action.</EmptyLine>
      ) : (
        <PurchaseOrderTable rows={rows} />
      )}
    </Panel>
  );
}

function RecentPOPanel({ purchaseOrders }: { purchaseOrders: PurchaseOrderResponse[] }) {
  const rows = [...purchaseOrders]
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
    .slice(0, 6);
  return (
    <Panel title="Recent Purchase Orders">
      {rows.length === 0 ? (
        <EmptyLine>No purchase orders yet.</EmptyLine>
      ) : (
        <PurchaseOrderTable rows={rows} />
      )}
    </Panel>
  );
}

function WarehouseInventoryPanel({
  warehouses,
  inventory,
  loading,
}: {
  warehouses: WarehouseResponse[];
  inventory: InventoryRow[];
  loading: boolean;
}) {
  return (
    <Panel
      title="Warehouse Stock Snapshot"
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/app/admin/warehouses">Open</Link>
        </Button>
      }
    >
      {loading ? (
        <LoadingLine />
      ) : warehouses.length === 0 ? (
        <EmptyLine>No warehouses found.</EmptyLine>
      ) : inventory.length === 0 ? (
        <EmptyLine>No inventory records found.</EmptyLine>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead className="text-right">Available</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.slice(0, 6).map((item) => (
              <TableRow key={`${item.warehouseId}-${item.inventoryId}`}>
                <TableCell className="font-medium">
                  {item.material?.materialName ?? `Material #${item.materialId}`}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {item.warehouseName}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.quantity.toLocaleString()} {item.material?.unit}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}

function LowStockPanel({ rows }: { rows: InventoryRow[] }) {
  return (
    <Panel
      title="Low-stock Watchlist"
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/app/admin/warehouses">Stock</Link>
        </Button>
      }
    >
      {rows.length === 0 ? (
        <EmptyLine>No low-stock materials detected from current inventory records.</EmptyLine>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Reorder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 6).map((item) => (
              <TableRow key={`${item.warehouseId}-${item.inventoryId}`}>
                <TableCell className="font-medium">
                  {item.material?.materialName ?? `Material #${item.materialId}`}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {item.warehouseName}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.quantity.toLocaleString()} {item.material?.unit}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.reorderLevel.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}

function PurchaseOrderTable({ rows }: { rows: PurchaseOrderResponse[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>PO</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((po) => (
          <TableRow key={po.poId}>
            <TableCell className="font-mono text-xs">#{po.poId}</TableCell>
            <TableCell>
              <Badge variant="outline" className={cn(statusConfig[po.status.toLowerCase()]?.cls)}>
                {po.status}
              </Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {formatDate(po.orderDate)}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatMoney(po.totalAmount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StatusBox({
  label,
  count,
  value,
  status,
}: {
  label: string;
  count: number;
  value: number;
  status: "pending" | "approved" | "delivered";
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Badge variant="outline" className={cn(statusConfig[status].cls)}>
          {count}
        </Badge>
      </div>
      <p className="mt-3 text-sm font-semibold tabular-nums">{formatMoney(value)}</p>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function LoadingLine() {
  return (
    <div className="py-6 text-center text-sm text-muted-foreground">Loading dashboard data...</div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <div className="py-6 text-center text-sm text-muted-foreground">{children}</div>;
}

function dashboardDescription(role: Role): string {
  if (role === "ADMIN")
    return "System-wide projects, procurement, users, warehouses, and stock signals.";
  if (role === "PM")
    return "Project status, project budgets, and procurement follow-up for your work.";
  if (role === "WAREHOUSE_MANAGER")
    return "Inventory health, purchase-order approvals, and warehouse import queue.";
  return "Role dashboard.";
}

function sumPOs(rows: PurchaseOrderResponse[]): number {
  return rows.reduce((sum, po) => sum + po.totalAmount, 0);
}

function formatMoney(value: number): string {
  return `${value.toLocaleString()} VND`;
}

function formatMoneyCompact(value: number): string {
  return `${shortNumber(value)} VND`;
}

function formatDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function shortNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function compactLabel(value: string): string {
  return value.length > 16 ? `${value.slice(0, 15)}...` : value;
}
