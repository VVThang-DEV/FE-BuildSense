import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { Check, ChevronDown, Plus, Sparkles, X, Download } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { consolidatedPOs } from "@/lib/mock-data";
import { cn, statusConfig } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { useSession } from "@/lib/session";
import { purchaseOrdersApi } from "@/api/purchaseOrders";
import { projectsApi } from "@/api/projects";
import { suppliersApi } from "@/api/suppliers";
import { warehousesApi } from "@/api/warehouses";

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
  const session = useSession();
  const isLive = !!session?.token;

  // ─── Demo state ───────────────────────────────────────────
  const [expanded, setExpanded] = useState<string | null>("po-001");
  const [demoPos, setDemoPos] = useState(consolidatedPOs);
  const updateDemo = (id: string, status: string) =>
    setDemoPos((p) => p.map((x) => x.id === id ? { ...x, status: status as any } : x));

  // ─── Live state ───────────────────────────────────────────
  const [creating, setCreating] = useState(false);
  const [newPO, setNewPO] = useState({ projectId: "", supplierId: "", matId: "1", qty: "1", price: "0" });

  // Import to warehouse state
  const [importOpen, setImportOpen] = useState(false);
  const [importPOId, setImportPOId] = useState<number | null>(null);
  const [importWarehouseId, setImportWarehouseId] = useState("");

  const { data: livePOs, refetch: refetchPOs } = useQuery({
    queryKey: ["pos"],
    queryFn: async () => { const r = await purchaseOrdersApi.getAll(); return r.result ?? []; },
    enabled: isLive, staleTime: 10_000,
  });
  const { data: liveProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => { const r = await projectsApi.getAll(); return r.result ?? []; },
    enabled: isLive,
  });
  const { data: liveSuppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => { const r = await suppliersApi.getAll(); return r.result ?? []; },
    enabled: isLive,
  });
  const { data: liveWarehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => { const r = await warehousesApi.getAll(); return r.result ?? []; },
    enabled: isLive,
  });

  const approveReal = async (poId: number) => {
    const res = await purchaseOrdersApi.approve(poId);
    res.isSuccess ? toast.success(`PO #${poId} approved`) : toast.error(res.errorMessage ?? "Failed");
    refetchPOs();
  };
  const importReal = async () => {
    if (!importPOId || !importWarehouseId) { toast.error("Select a warehouse"); return; }
    const res = await purchaseOrdersApi.importToWarehouse(importPOId, Number(importWarehouseId));
    if (res.isSuccess) {
      toast.success(`PO #${importPOId} imported to warehouse`);
      setImportOpen(false);
      setImportPOId(null);
      setImportWarehouseId("");
      refetchPOs();
    } else toast.error((res as any).errorMessage ?? "Import failed");
  };
  const submitCreate = async () => {
    if (!newPO.projectId || !newPO.supplierId) { toast.error("Project and supplier required"); return; }
    const res = await purchaseOrdersApi.create({
      projectId: Number(newPO.projectId), supplierId: Number(newPO.supplierId),
      items: [{ materialId: Number(newPO.matId) || 1, quantity: Number(newPO.qty) || 1, unitPrice: Number(newPO.price) || 0 }],
    });
    if (res.isSuccess) {
      toast.success("PO created"); setCreating(false);
      setNewPO({ projectId: "", supplierId: "", matId: "1", qty: "1", price: "0" });
      refetchPOs();
    } else toast.error(res.errorMessage ?? "Create failed");
  };

  const pendingLive = (livePOs ?? []).filter((p) => p.status === "PENDING");
  const historyLive = (livePOs ?? []).filter((p) => p.status !== "PENDING");
  const projName = (id: number) => liveProjects?.find((p) => p.projectId === id)?.projectName ?? `#${id}`;
  const suppName = (id: number) => liveSuppliers?.find((s) => s.supplierId === id)?.companyName ?? `#${id}`;

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Operations" title="Procurement"
        description={isLive ? "Live purchase orders from backend." : "AI consolidates material requests across houses into single vendor POs."}
        actions={
          isLive ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setCreating(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> New PO
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={async () => { for (const po of pendingLive) await approveReal(po.poId); }}>
                <Check className="h-3.5 w-3.5 mr-1" /> Approve all pending
              </Button>
            </div>
          ) : (
            <Button size="sm" className="h-8 text-xs" onClick={() => {
              setDemoPos((p) => p.map((x) => x.status === "pending" ? { ...x, status: "approved" } : x));
              toast.success("All pending POs approved");
            }}>
              <Check className="h-3.5 w-3.5 mr-1" /> Approve all pending
            </Button>
          )
        }
      />

      {/* Create PO dialog — live mode only */}
      {isLive && (
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogContent>
            <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Project</Label>
                <Select value={newPO.projectId} onValueChange={(v) => setNewPO((p) => ({ ...p, projectId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{(liveProjects ?? []).map((p) => <SelectItem key={p.projectId} value={String(p.projectId)}>{p.projectName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Supplier</Label>
                <Select value={newPO.supplierId} onValueChange={(v) => setNewPO((p) => ({ ...p, supplierId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>{(liveSuppliers ?? []).map((s) => <SelectItem key={s.supplierId} value={String(s.supplierId)}>{s.companyName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="border rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Line item</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Material ID</Label><Input type="number" value={newPO.matId} onChange={(e) => setNewPO((p) => ({ ...p, matId: e.target.value }))} /></div>
                  <div><Label className="text-xs">Qty</Label><Input type="number" value={newPO.qty} onChange={(e) => setNewPO((p) => ({ ...p, qty: e.target.value }))} /></div>
                  <div><Label className="text-xs">Unit price</Label><Input type="number" value={newPO.price} onChange={(e) => setNewPO((p) => ({ ...p, price: e.target.value }))} /></div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              <Button onClick={submitCreate}>Create PO</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Import to warehouse dialog */}
      {isLive && (
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Import PO #{importPOId} to Warehouse</DialogTitle></DialogHeader>
            <div>
              <Label>Select warehouse</Label>
              <Select value={importWarehouseId} onValueChange={setImportWarehouseId}>
                <SelectTrigger><SelectValue placeholder="Choose warehouse" /></SelectTrigger>
                <SelectContent>
                  {(liveWarehouses ?? []).map((w) => (
                    <SelectItem key={w.warehouseId} value={String(w.warehouseId)}>{w.warehouseName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(liveWarehouses ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">No warehouses found — create one in the Warehouses page first.</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
              <Button onClick={importReal}><Download className="h-3.5 w-3.5 mr-1" /> Import to warehouse</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">Inbox{isLive && pendingLive.length > 0 && <Badge className="ml-1.5 h-4 min-w-[1rem] rounded-full text-[9px] p-0 flex items-center justify-center">{pendingLive.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          {isLive ? (
            <Card className="shadow-sm"><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>PO #</TableHead><TableHead>Project</TableHead><TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Total</TableHead><TableHead>Date</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pendingLive.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No pending POs</TableCell></TableRow>}
                  {pendingLive.map((po) => (
                    <TableRow key={po.poId}>
                      <TableCell className="font-mono text-xs text-muted-foreground">#{po.poId}</TableCell>
                      <TableCell className="font-medium">{projName(po.projectId)}</TableCell>
                      <TableCell>{suppName(po.supplierId)}</TableCell>
                      <TableCell className="text-right tabular-nums">₹{po.totalAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant="outline" className={cn(statusConfig["pending"].cls)}>Pending</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => approveReal(po.poId)}><Check className="h-3 w-3" /> Approve</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-ai" /> AI-consolidated POs</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead></TableHead><TableHead>Item</TableHead>
                    <TableHead className="text-right">Total qty</TableHead><TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Est. savings</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {demoPos.map((po) => (
                      <Fragment key={po.id}>
                        <TableRow className="cursor-pointer" onClick={() => setExpanded(expanded === po.id ? null : po.id)}>
                          <TableCell><ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded === po.id && "rotate-180")} /></TableCell>
                          <TableCell className="font-medium">{po.item}</TableCell>
                          <TableCell className="text-right tabular-nums">{po.totalQty} {po.unit}</TableCell>
                          <TableCell>{po.vendor}</TableCell>
                          <TableCell className="text-right text-success tabular-nums">{po.estSavings}</TableCell>
                          <TableCell><Badge variant="outline" className={cn(statusConfig[po.status]?.cls)}>{statusConfig[po.status]?.label}</Badge></TableCell>
                          <TableCell className="text-right">
                            {po.status === "pending" && (
                              <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { updateDemo(po.id, "approved"); toast.success(`PO ${po.id} approved`); }}><Check className="h-3 w-3" /> Approve</Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => { updateDemo(po.id, "rejected"); toast.success(`PO ${po.id} rejected`); }}><X className="h-3 w-3" /></Button>
                              </div>
                            )}
                            {po.status === "approved" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { updateDemo(po.id, "ordered"); toast.success(`PO ${po.id} sent to vendor`); }}>Send to vendor</Button>}
                            {po.status === "ordered" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { updateDemo(po.id, "delivered"); toast.success(`PO ${po.id} delivered`); }}>Mark delivered</Button>}
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
                                <p className="text-[11px] text-ai mt-2 flex items-center gap-1"><Sparkles className="h-3 w-3" />AI merged requests across {po.sources.length} sites → {po.totalQty} {po.unit} from {po.vendor}, saving {po.estSavings}.</p>
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
          )}
        </TabsContent>

        <TabsContent value="history">
          {isLive ? (
            <Card className="shadow-sm"><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>PO #</TableHead><TableHead>Project</TableHead><TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Total</TableHead><TableHead>Date</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {historyLive.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No closed POs</TableCell></TableRow>}
                  {historyLive.map((po) => (
                    <TableRow key={po.poId}>
                      <TableCell className="font-mono text-xs text-muted-foreground">#{po.poId}</TableCell>
                      <TableCell className="font-medium">{projName(po.projectId)}</TableCell>
                      <TableCell>{suppName(po.supplierId)}</TableCell>
                      <TableCell className="text-right tabular-nums">₹{po.totalAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant="outline" className={cn(statusConfig[po.status.toLowerCase() as keyof typeof statusConfig]?.cls ?? "")}>{po.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {po.status === "APPROVED" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setImportPOId(po.poId); setImportWarehouseId(""); setImportOpen(true); }}>
                            <Download className="h-3 w-3 mr-1" /> Import
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[{ label: "Total POs closed", value: "142" }, { label: "Avg. approval time", value: "6 h" }, { label: "On-time delivery", value: "98%" }].map((s) => (
                  <Card key={s.label} className="shadow-sm">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-primary">{s.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="shadow-sm"><CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>PO #</TableHead><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Vendor</TableHead>
                    <TableHead>Approved</TableHead><TableHead>Delivered</TableHead>
                    <TableHead className="text-right">Amount</TableHead><TableHead>On Time</TableHead>
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
              </CardContent></Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
