import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { Check, ChevronDown, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { consolidatedPOs } from "@/lib/mock-data";
import { cn, statusConfig } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";

const completedPOs = [
  { id: "po-089", item: "TMT Steel Phi 10", qty: "2 400 kg", vendor: "SteelMart", approved: "Oct 01, 2025", delivered: "Oct 05, 2025", amount: "₹1,44,000", onTime: true },
  { id: "po-078", item: "Red Clay Bricks", qty: "18 000 units", vendor: "BuildMart", approved: "Sep 24, 2025", delivered: "Sep 28, 2025", amount: "₹54,000", onTime: true },
  { id: "po-073", item: "Portland Cement OPC 43", qty: "600 bags", vendor: "CemCo", approved: "Sep 18, 2025", delivered: "Sep 23, 2025", amount: "₹1,98,000", onTime: false },
  { id: "po-065", item: "TMT Steel Phi 20", qty: "1 800 kg", vendor: "SteelMart", approved: "Sep 10, 2025", delivered: "Sep 13, 2025", amount: "₹1,17,000", onTime: true },
  { id: "po-051", item: "M-Sand (river sand alt)", qty: "22 loads", vendor: "GreenAgg", approved: "Aug 28, 2025", delivered: "Sep 01, 2025", amount: "₹66,000", onTime: true },
  { id: "po-040", item: "20mm Aggregates", qty: "15 loads", vendor: "GreenAgg", approved: "Aug 15, 2025", delivered: "Aug 17, 2025", amount: "₹37,500", onTime: true },
];

export const Route = createFileRoute("/app/procurement")({
  head: () => ({ meta: [{ title: "Procurement — BuildSense AI" }] }),
  component: ProcurementPage,
});

function ProcurementPage() {
  const [expanded, setExpanded] = useState<string | null>("po-001");
  const [pos, setPos] = useState(consolidatedPOs);

  const update = (id: string, status: typeof consolidatedPOs[number]["status"]) => {
    setPos((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    toast.success(`PO ${id} marked ${status}`);
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Operations"
        title="Procurement"
        description="AI consolidates material requests across houses into single vendor POs."
        actions={
          <Button size="sm" className="h-8 text-xs" onClick={() => {
            setPos((p) => p.map((x) => (x.status === "pending" ? { ...x, status: "approved" } : x)));
            toast.success("All pending POs approved");
          }}>
            <Check className="h-3.5 w-3.5 mr-1" /> Approve all pending
          </Button>
        }
      />

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-ai" /> AI-consolidated POs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Total qty</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Est. savings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pos.map((po) => (
                    <Fragment key={po.id}>
                      <TableRow className="cursor-pointer" onClick={() => setExpanded(expanded === po.id ? null : po.id)}>
                        <TableCell><ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded === po.id && "rotate-180")} /></TableCell>
                        <TableCell className="font-medium">{po.item}</TableCell>
                        <TableCell className="text-right tabular-nums">{po.totalQty} {po.unit}</TableCell>
                        <TableCell>{po.vendor}</TableCell>
                        <TableCell className="text-right text-success tabular-nums">{po.estSavings}</TableCell>
                        <TableCell><Badge variant="outline" className={cn(statusConfig[po.status].cls)}>{statusConfig[po.status].label}</Badge></TableCell>
                        <TableCell className="text-right">
                          {po.status === "pending" && (
                            <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => update(po.id, "approved")}>
                                <Check className="h-3 w-3" /> Approve
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => update(po.id, "rejected" as typeof consolidatedPOs[number]["status"])}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          {po.status === "approved" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => update(po.id, "ordered")}>Send to vendor</Button>
                          )}
                          {po.status === "ordered" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => update(po.id, "delivered")}>Mark delivered</Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {expanded === po.id && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/40">
                            <div className="px-6 py-3 space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Consolidated from {po.sources.length} houses:</p>
                              <div className="grid sm:grid-cols-3 gap-2">
                                {po.sources.map((s) => (
                                  <div key={s.house} className="rounded-md bg-background border p-2 text-xs">
                                    <p className="font-medium">{s.house}</p>
                                    <p className="text-muted-foreground tabular-nums">{s.qty} {po.unit}</p>
                                  </div>
                                ))}
                              </div>
                              <p className="text-[11px] text-ai mt-2 flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                AI merged requests across {po.sources.length} sites → {po.totalQty} {po.unit} from {po.vendor}, saving {po.estSavings}.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Total POs closed", value: "142" },
              { label: "Avg. approval time", value: "6 h" },
              { label: "On-time delivery", value: "98%" },
            ].map((s) => (
              <Card key={s.label} className="shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>PO #</TableHead><TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead><TableHead>Vendor</TableHead>
                  <TableHead>Approved</TableHead><TableHead>Delivered</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>On Time</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {completedPOs.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{po.id}</TableCell>
                      <TableCell className="font-medium text-[13px]">{po.item}</TableCell>
                      <TableCell className="text-xs">{po.qty}</TableCell>
                      <TableCell className="text-xs">{po.vendor}</TableCell>
                      <TableCell className="text-xs">{po.approved}</TableCell>
                      <TableCell className="text-xs">{po.delivered}</TableCell>
                      <TableCell className="text-right tabular-nums text-[13px]">{po.amount}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(po.onTime ? "bg-success/12 text-success border-success/30" : "bg-warning/15 text-warning-foreground border-warning/40", "text-[10px]")}>
                          {po.onTime ? "✓ On time" : "⚠ Delayed"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
