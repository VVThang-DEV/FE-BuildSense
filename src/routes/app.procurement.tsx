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
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => update(po.id, "pending")}>
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
          <Card><CardContent className="p-6 text-sm text-muted-foreground">
            Past POs · 142 records · Average approval time 6h · 98% on-time delivery
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
