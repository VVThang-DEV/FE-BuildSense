import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  Clock3,
  History,
  MapPin,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  User,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import {
  warehousesApi,
  type InventoryItem,
  type InventoryTransactionResponse,
  type WarehouseResponse,
} from "@/api/warehouses";
import { requireApiResult } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryError } from "@/components/query-error";
import { cn } from "@/lib/utils";

type StockFilter = "all" | "low" | "reserved" | "on-order" | "quarantine";

type Props = {
  warehouses: WarehouseResponse[];
  selectedId: number | null;
  onSelectWarehouse: (id: number) => void;
  canAdjustInventory: boolean;
  onAdjust: () => void;
  onReturn: () => void;
};

export function WarehouseInventoryWorkspace({
  warehouses,
  selectedId,
  onSelectWarehouse,
  canAdjustInventory,
  onAdjust,
  onReturn,
}: Props) {
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  useEffect(() => {
    if (selectedId === null && warehouses.length) onSelectWarehouse(warehouses[0].warehouseId);
  }, [onSelectWarehouse, selectedId, warehouses]);

  const inventoryQuery = useQuery({
    queryKey: ["warehouse-inventory", selectedId],
    queryFn: async () =>
      requireApiResult(
        await warehousesApi.getInventory(selectedId!),
        "Could not load warehouse inventory",
      ) ?? [],
    enabled: selectedId !== null,
    staleTime: 10_000,
  });
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

  const selectedWarehouse = warehouses.find((warehouse) => warehouse.warehouseId === selectedId);
  const inventory = useMemo(() => inventoryQuery.data ?? [], [inventoryQuery.data]);
  const summary = useMemo(
    () => ({
      value: inventory.reduce((total, item) => total + Number(item.inventoryValue || 0), 0),
      skus: inventory.length,
      low: inventory.filter((item) => item.isLowStock).length,
      reserved: inventory.filter((item) => item.reservedQuantity > 0).length,
      onOrder: inventory.filter((item) => item.onOrderQuantity > 0).length,
      quarantine: inventory.filter((item) => item.quarantineQuantity > 0).length,
    }),
    [inventory],
  );
  const filteredInventory = useMemo(() => {
    const term = search.trim().toLowerCase();
    return inventory.filter((item) => {
      const matchesSearch =
        !term ||
        item.material?.materialName.toLowerCase().includes(term) ||
        item.variantName?.toLowerCase().includes(term) ||
        String(item.variantId).includes(term);
      const matchesFilter =
        stockFilter === "all" ||
        (stockFilter === "low" && item.isLowStock) ||
        (stockFilter === "reserved" && item.reservedQuantity > 0) ||
        (stockFilter === "on-order" && item.onOrderQuantity > 0) ||
        (stockFilter === "quarantine" && item.quarantineQuantity > 0);
      return matchesSearch && matchesFilter;
    });
  }, [inventory, search, stockFilter]);
  const lastUpdated = inventory.reduce<string | null>((latest, item) => {
    if (!item.updatedAt) return latest;
    if (!latest || new Date(item.updatedAt) > new Date(latest)) return item.updatedAt;
    return latest;
  }, null);

  const refresh = async () => {
    await Promise.all([inventoryQuery.refetch(), transactionsQuery.refetch()]);
    toast.success("Inventory data refreshed");
  };

  return (
    <div className="space-y-5">
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <Label htmlFor="warehouse-selector" className="text-xs text-muted-foreground">
                Active warehouse
              </Label>
              <Select
                value={selectedId ? String(selectedId) : ""}
                onValueChange={(value) => {
                  onSelectWarehouse(Number(value));
                  setSearch("");
                  setStockFilter("all");
                }}
              >
                <SelectTrigger id="warehouse-selector" className="mt-1 max-w-xl">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.warehouseId} value={String(warehouse.warehouseId)}>
                      {warehouse.warehouseName} · {warehouse.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedWarehouse && (
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {selectedWarehouse.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {selectedWarehouse.managerName ||
                      `Manager #${selectedWarehouse.managerId ?? "-"}`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    {lastUpdated
                      ? `Stock updated ${new Date(lastUpdated).toLocaleString()}`
                      : "No stock update recorded"}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!selectedId || inventoryQuery.isFetching || transactionsQuery.isFetching}
                onClick={refresh}
              >
                <RefreshCw
                  className={cn(
                    "mr-1.5 h-3.5 w-3.5",
                    (inventoryQuery.isFetching || transactionsQuery.isFetching) && "animate-spin",
                  )}
                />
                Refresh
              </Button>
              {canAdjustInventory && (
                <>
                  <Button size="sm" variant="outline" onClick={onReturn}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Record return
                  </Button>
                  <Button size="sm" onClick={onAdjust}>
                    <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> Adjust stock
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <InventoryMetric
          label="Inventory value"
          value={formatNumber(summary.value)}
          icon={CircleDollarSign}
        />
        <InventoryMetric label="Stocked SKUs" value={String(summary.skus)} icon={Boxes} />
        <InventoryMetric
          label="Low stock"
          value={String(summary.low)}
          icon={AlertTriangle}
          tone={summary.low > 0 ? "danger" : undefined}
        />
        <InventoryMetric
          label="Reserved SKUs"
          value={String(summary.reserved)}
          icon={PackageCheck}
        />
        <InventoryMetric label="On-order SKUs" value={String(summary.onOrder)} icon={History} />
        <InventoryMetric
          label="Quarantined SKUs"
          value={String(summary.quarantine)}
          icon={RotateCcw}
          tone={summary.quarantine > 0 ? "warning" : undefined}
        />
      </div>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="transactions">
            Transactions ({transactionsQuery.data?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card className="shadow-sm">
            <CardHeader className="border-b pb-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle className="text-base">Stock ledger</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Quantities reflect the latest recorded warehouse transactions.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative sm:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search material or variant"
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={stockFilter}
                    onValueChange={(value) => setStockFilter(value as StockFilter)}
                  >
                    <SelectTrigger className="sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All stock</SelectItem>
                      <SelectItem value="low">Low stock</SelectItem>
                      <SelectItem value="reserved">With reservations</SelectItem>
                      <SelectItem value="on-order">On order</SelectItem>
                      <SelectItem value="quarantine">Quarantined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {inventoryQuery.isLoading ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  Loading inventory...
                </div>
              ) : inventoryQuery.isError ? (
                <QueryError
                  message={
                    inventoryQuery.error instanceof Error ? inventoryQuery.error.message : undefined
                  }
                  onRetry={() => inventoryQuery.refetch()}
                />
              ) : (
                <InventoryTable rows={filteredInventory} hasInventory={inventory.length > 0} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card className="shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Inventory transaction log</CardTitle>
              <p className="text-xs text-muted-foreground">
                Immutable stock movements recorded for the selected warehouse.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {transactionsQuery.isLoading ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  Loading transactions...
                </div>
              ) : transactionsQuery.isError ? (
                <QueryError
                  message={
                    transactionsQuery.error instanceof Error
                      ? transactionsQuery.error.message
                      : undefined
                  }
                  onRetry={() => transactionsQuery.refetch()}
                />
              ) : (
                <TransactionTable
                  transactions={transactionsQuery.data ?? []}
                  inventory={inventory}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InventoryTable({ rows, hasInventory }: { rows: InventoryItem[]; hasInventory: boolean }) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1180px]">
        <TableHeader>
          <TableRow>
            <TableHead>Material / variant</TableHead>
            <TableHead className="text-right">On hand</TableHead>
            <TableHead className="text-right">Available</TableHead>
            <TableHead className="text-right">Reserved</TableHead>
            <TableHead className="text-right">On order</TableHead>
            <TableHead className="text-right">Quarantine</TableHead>
            <TableHead className="text-right">Reorder level</TableHead>
            <TableHead className="text-right">Avg. cost</TableHead>
            <TableHead className="text-right">Stock value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                {hasInventory
                  ? "No stock matches the current filters."
                  : "This warehouse has no inventory records."}
              </TableCell>
            </TableRow>
          )}
          {rows.map((item) => {
            const unit = item.material?.unit ?? "";
            return (
              <TableRow
                key={item.inventoryId}
                className={cn(item.isLowStock && "bg-destructive/[0.03]")}
              >
                <TableCell>
                  <p className="font-medium">
                    {item.material?.materialName ?? `Material #${item.materialId}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.variantName || `Variant #${item.variantId}`} · ID {item.variantId}
                  </p>
                </TableCell>
                <QuantityCell value={item.quantity} unit={unit} />
                <QuantityCell value={item.availableQuantity} unit={unit} emphasized />
                <QuantityCell value={item.reservedQuantity} unit={unit} />
                <QuantityCell value={item.onOrderQuantity} unit={unit} />
                <QuantityCell
                  value={item.quarantineQuantity}
                  unit={unit}
                  warning={item.quarantineQuantity > 0}
                />
                <QuantityCell value={item.reorderLevel} unit={unit} />
                <TableCell className="text-right tabular-nums">
                  {formatNumber(item.averageUnitCost)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatNumber(item.inventoryValue)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      item.isLowStock
                        ? "border-destructive/40 bg-destructive/5 text-destructive"
                        : "border-success/30 bg-success/5 text-success",
                    )}
                  >
                    {item.isLowStock ? "Low stock" : "Healthy"}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {item.updatedAt ? formatDateTime(item.updatedAt) : "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function TransactionTable({
  transactions,
  inventory,
}: {
  transactions: InventoryTransactionResponse[];
  inventory: InventoryItem[];
}) {
  if (transactions.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        No inventory transactions have been recorded for this warehouse.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1050px]">
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Material / variant</TableHead>
            <TableHead className="text-right">Change</TableHead>
            <TableHead className="text-right">Before → after</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Traceability</TableHead>
            <TableHead>Performed by</TableHead>
            <TableHead className="text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            const stockItem = inventory.find((item) => item.variantId === transaction.variantId);
            return (
              <TableRow key={transaction.transactionId}>
                <TableCell className="whitespace-nowrap text-xs">
                  {formatDateTime(transaction.transactionDate)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {transaction.transactionType.replaceAll("_", " ")}
                  </Badge>
                  {transaction.note && (
                    <p className="mt-1 max-w-56 truncate text-xs text-muted-foreground">
                      {transaction.note}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <p className="font-medium">
                    {stockItem?.material?.materialName ?? `Variant #${transaction.variantId}`}
                  </p>
                  {stockItem?.variantName && (
                    <p className="text-xs text-muted-foreground">{stockItem.variantName}</p>
                  )}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium tabular-nums",
                    transaction.quantity > 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {transaction.quantity > 0 ? "+" : ""}
                  {formatNumber(transaction.quantity)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(transaction.quantityBefore)} →{" "}
                  {formatNumber(transaction.quantityAfter)}
                </TableCell>
                <TableCell className="text-xs">
                  {transaction.referenceType || transaction.referenceId
                    ? `${transaction.referenceType || "Reference"} #${transaction.referenceId ?? "-"}`
                    : "-"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {[transaction.lotNumber, transaction.batchNumber].filter(Boolean).join(" · ") ||
                    "-"}
                  {transaction.serialNumber && <p>Serial {transaction.serialNumber}</p>}
                  {transaction.expiryDate && (
                    <p>Expires {new Date(transaction.expiryDate).toLocaleDateString()}</p>
                  )}
                </TableCell>
                <TableCell className="text-xs">User #{transaction.performedByUserId}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {transaction.totalValue != null ? formatNumber(transaction.totalValue) : "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function InventoryMetric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone?: "danger" | "warning";
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p
            className={cn(
              "mt-1 text-xl font-semibold tabular-nums",
              tone === "danger" && "text-destructive",
              tone === "warning" && "text-warning-foreground",
            )}
          >
            {value}
          </p>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function QuantityCell({
  value,
  unit,
  emphasized,
  warning,
}: {
  value: number;
  unit: string;
  emphasized?: boolean;
  warning?: boolean;
}) {
  return (
    <TableCell
      className={cn(
        "text-right tabular-nums",
        emphasized && "font-semibold",
        warning && "text-warning-foreground",
      )}
    >
      {formatNumber(value)}
      {unit && <span className="ml-1 text-[10px] text-muted-foreground">{unit}</span>}
    </TableCell>
  );
}

function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}
