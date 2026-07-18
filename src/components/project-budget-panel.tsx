import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleDollarSign, History, Pencil } from "lucide-react";
import { toast } from "sonner";
import { projectsApi } from "@/api/projects";
import { purchaseOrdersApi } from "@/api/purchaseOrders";
import { usersApi } from "@/api/users";
import { requireApiResult } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QueryError } from "@/components/query-error";

export function ProjectBudgetPanel({
  projectId,
  budget,
  currency,
  canAdjust,
  canViewHistory,
  onUpdated,
}: {
  projectId: number;
  budget: number;
  currency: string;
  canAdjust: boolean;
  canViewHistory: boolean;
  onUpdated: () => Promise<unknown> | unknown;
}) {
  const queryClient = useQueryClient();
  const [adjusting, setAdjusting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const historiesQuery = useQuery({
    queryKey: ["project-budget-histories", projectId],
    queryFn: async () =>
      requireApiResult(
        await projectsApi.getBudgetHistories(projectId),
        "Could not load budget history",
      ) ?? [],
    enabled: projectId > 0 && canViewHistory,
    staleTime: 10_000,
  });

  const ordersQuery = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () =>
      requireApiResult(
        await purchaseOrdersApi.getAll(),
        "Could not load project purchase orders",
      ) ?? [],
    enabled: projectId > 0,
    staleTime: 10_000,
  });

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: async () =>
      requireApiResult(await usersApi.getAll(), "Could not load account names") ?? [],
    enabled: canAdjust,
    staleTime: 30_000,
  });

  const projectOrders = (ordersQuery.data ?? []).filter((order) => order.projectId === projectId);
  const pendingAmount = sumOrders(projectOrders, "PENDING");
  const committedAmount = sumOrders(projectOrders, "APPROVED");
  const actualAmount = sumOrders(projectOrders, "DELIVERED");
  const heldBudget = pendingAmount + committedAmount + actualAmount;
  const remainingBudget = budget - heldBudget;
  const updatedByAccount = (userId: number) =>
    (usersQuery.data ?? []).find((account) => account.id === userId);

  const closeDialog = () => {
    if (saving) return;
    setAdjusting(false);
    setAmount("");
    setReason("");
  };

  const submitAdjustment = async () => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount === 0) {
      toast.error("Adjustment amount must be a non-zero number");
      return;
    }
    if (budget + parsedAmount < 0) {
      toast.error("The resulting project budget cannot be negative");
      return;
    }
    if (!ordersQuery.isError && budget + parsedAmount < heldBudget) {
      toast.error(
        `Budget cannot be reduced below ${heldBudget.toLocaleString()} ${currency}, which is already held by active and delivered purchase orders`,
      );
      return;
    }
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.error("A reason is required for the audit history");
      return;
    }
    if (trimmedReason.length > 500) {
      toast.error("Reason must be 500 characters or fewer");
      return;
    }

    setSaving(true);
    try {
      const response = await projectsApi.adjustBudget({
        projectId,
        amount: parsedAmount,
        reason: trimmedReason,
      });
      if (!response.isSuccess) {
        const message =
          response.errorMessage ??
          (typeof response.result === "string" ? response.result : null) ??
          "Could not adjust project budget";
        toast.error(message);
        return;
      }
      toast.success(
        `Budget updated to ${Number(response.result?.newBudget ?? budget + parsedAmount).toLocaleString()} ${currency}`,
      );
      setAdjusting(false);
      setAmount("");
      setReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["project-budget-histories", projectId] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        onUpdated(),
      ]);
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="mt-4 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CircleDollarSign className="h-4 w-4 text-primary" /> Project budget
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Current budget and adjustment audit history.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-lg font-semibold tabular-nums">
                {budget.toLocaleString()} {currency}
              </p>
              {canAdjust && (
                <Button size="sm" onClick={() => setAdjusting(true)}>
                  <Pencil className="mr-1.5 h-4 w-4" /> Adjust budget
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid gap-3 border-y bg-muted/20 p-4 sm:grid-cols-2 xl:grid-cols-5">
            <BudgetMetric label="Total budget" value={budget} currency={currency} />
            <BudgetMetric label="Pending / reserved" value={pendingAmount} currency={currency} />
            <BudgetMetric
              label="Approved / committed"
              value={committedAmount}
              currency={currency}
            />
            <BudgetMetric label="Delivered / actual" value={actualAmount} currency={currency} />
            <BudgetMetric
              label="Remaining"
              value={remainingBudget}
              currency={currency}
              warning={remainingBudget < 0}
            />
          </div>
          {ordersQuery.isError && (
            <p className="border-b px-4 py-2 text-xs text-destructive">
              PO totals are unavailable; the budget breakdown may be incomplete.
            </p>
          )}
          <div className="border-b px-4 py-3">
            <p className="text-sm font-medium">Budget adjustment history</p>
            <p className="text-xs text-muted-foreground">
              This audit records changes to the approved budget limit, not purchase-order spending.
            </p>
          </div>
          {!canViewHistory ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Budget adjustment history is available to administrators and the project manager.
            </div>
          ) : historiesQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading budget history...
            </div>
          ) : historiesQuery.isError ? (
            <QueryError
              message={
                historiesQuery.error instanceof Error ? historiesQuery.error.message : undefined
              }
              onRetry={() => historiesQuery.refetch()}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Previous</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">New budget</TableHead>
                  <TableHead className="text-right">Updated by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(historiesQuery.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      <History className="mx-auto mb-2 h-4 w-4" /> No budget adjustments yet
                    </TableCell>
                  </TableRow>
                )}
                {(historiesQuery.data ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs">{formatDate(item.createdAt)}</TableCell>
                    <TableCell className="max-w-sm">{item.reason || "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.previousBudget.toLocaleString()} {currency}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium tabular-nums ${item.amountChanged < 0 ? "text-destructive" : "text-success"}`}
                    >
                      {item.amountChanged > 0 ? "+" : ""}
                      {item.amountChanged.toLocaleString()} {currency}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {item.newBudget.toLocaleString()} {currency}
                    </TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const account = updatedByAccount(item.updatedByUserId);
                        const fullName = account
                          ? `${account.firstName} ${account.lastName}`.trim()
                          : "";
                        return (
                          <>
                            <p>{fullName || account?.email || `User #${item.updatedByUserId}`}</p>
                            {fullName && account?.email && (
                              <p className="text-xs text-muted-foreground">{account.email}</p>
                            )}
                          </>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={adjusting} onOpenChange={(open) => (open ? setAdjusting(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust project budget</DialogTitle>
            <DialogDescription>
              Use a positive amount to increase the budget or a negative amount to reduce it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="budget-adjustment-amount">Adjustment amount ({currency})</Label>
              <Input
                id="budget-adjustment-amount"
                type="number"
                step="1000"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={saving}
                placeholder="10000000 or -5000000"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Result: {(budget + (Number(amount) || 0)).toLocaleString()} {currency}
              </p>
            </div>
            <div>
              <div className="flex justify-between gap-2">
                <Label htmlFor="budget-adjustment-reason">Reason</Label>
                <span className="text-xs text-muted-foreground">{reason.length}/500</span>
              </div>
              <Textarea
                id="budget-adjustment-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                disabled={saving}
                placeholder="Approved scope change, additional funding, correction..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitAdjustment} disabled={saving}>
              {saving ? "Saving..." : "Save adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function sumOrders(orders: Array<{ status: string; totalAmount: number }>, status: string): number {
  return orders
    .filter((order) => order.status === status)
    .reduce((total, order) => total + Number(order.totalAmount || 0), 0);
}

function BudgetMetric({
  label,
  value,
  currency,
  warning = false,
}: {
  label: string;
  value: number;
  currency: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-semibold tabular-nums ${warning ? "text-destructive" : "text-foreground"}`}
      >
        {value.toLocaleString()} {currency}
      </p>
    </div>
  );
}
