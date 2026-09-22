import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { warehouseTransfersApi, type WarehouseTransferResponse } from "@/api/warehouseTransfers";
import { requireApiResult } from "@/api/client";
import { useSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const Route = createFileRoute("/app/warehouse-transfers")({
  head: () => ({ meta: [{ title: "Warehouse Transfers - BuildSense AI" }] }),
  component: WarehouseTransfersPage,
});

// Transfer writes are retired (HTTP 410) under the single-warehouse model.
// This page keeps the read endpoints for historical records only.
function WarehouseTransfersPage() {
  const session = useSession();
  const [selectedTransfer, setSelectedTransfer] = useState<WarehouseTransferResponse | null>(null);

  const transfersQuery = useQuery({
    queryKey: ["warehouse-transfers"],
    queryFn: async () =>
      requireApiResult(
        await warehouseTransfersApi.getAll(),
        "Could not load warehouse transfers",
      ) ?? [],
    enabled: !!session?.token,
    staleTime: 10_000,
  });

  const transfers = transfersQuery.data ?? [];

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        section="Operations"
        title="Warehouse Transfers"
        description="Historical transfer records (read-only). Transfer create, approve, ship, receive, and cancel actions are retired under the single-warehouse model."
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Transfer history ({transfers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transfersQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading transfers...
            </div>
          ) : transfersQuery.isError ? (
            <QueryError
              message={
                transfersQuery.error instanceof Error ? transfersQuery.error.message : undefined
              }
              onRetry={() => transfersQuery.refetch()}
            />
          ) : transfers.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No transfer records on file.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => (
                  <TableRow key={transfer.transferId}>
                    <TableCell className="font-medium">#{transfer.transferId}</TableCell>
                    <TableCell className="text-sm">
                      {transfer.sourceWarehouseName} → {transfer.destinationWarehouseName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(transfer.requestedAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{transfer.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => setSelectedTransfer(transfer)}
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

      <Dialog open={selectedTransfer !== null} onOpenChange={(open) => !open && setSelectedTransfer(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer #{selectedTransfer?.transferId}</DialogTitle>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
                <TransferInfo label="Source" value={selectedTransfer.sourceWarehouseName} />
                <TransferInfo
                  label="Destination"
                  value={selectedTransfer.destinationWarehouseName}
                />
                <TransferInfo label="Status" value={selectedTransfer.status} />
                <TransferInfo label="Requested" value={formatDate(selectedTransfer.requestedAt)} />
                {selectedTransfer.note && (
                  <TransferInfo label="Note" value={selectedTransfer.note} />
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Requested</TableHead>
                    <TableHead className="text-right">Shipped</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedTransfer.items.map((item) => (
                    <TableRow key={item.transferItemId}>
                      <TableCell className="font-medium">
                        {item.materialName}
                        {item.variantName && (
                          <p className="text-xs text-muted-foreground">{item.variantName}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.requestedQuantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.shippedQuantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.receivedQuantity} {item.unit}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTransfer(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransferInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}
