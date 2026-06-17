import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Package, PackagePlus, AlertCircle, Tags } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { materialTree, type MaterialNode } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { useSession } from "@/lib/session";
import { materialsApi } from "@/api/materials";
import { catalogsApi } from "@/api/catalogs";

export const Route = createFileRoute("/app/materials")({
  head: () => ({ meta: [{ title: "Material Catalog — BuildSense AI" }] }),
  component: MaterialsPage,
});

function MaterialsPage() {
  const session = useSession();
  const isLive = !!session?.token;

  const { data: liveMaterials, isLoading, refetch } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => { const r = await materialsApi.getAll(); return r.result ?? []; },
    enabled: isLive,
    staleTime: 60_000,
  });

  // Add Material dialog
  const [matOpen, setMatOpen] = useState(false);
  const [matForm, setMatForm] = useState({ materialName: "", unit: "", categoryId: "1" });
  const submitMaterial = async () => {
    if (!matForm.materialName.trim() || !matForm.unit.trim()) { toast.error("Name and unit are required"); return; }
    const r = await materialsApi.create({
      materialName: matForm.materialName,
      unit: matForm.unit,
      categoryId: Number(matForm.categoryId) || 1,
    });
    if (r.isSuccess) {
      toast.success("Material added");
      setMatOpen(false);
      setMatForm({ materialName: "", unit: "", categoryId: "1" });
      refetch();
    } else toast.error(r.errorMessage ?? "Create failed");
  };

  // Add Catalog dialog
  const [catOpen, setCatOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const submitCatalog = async () => {
    if (!catName.trim()) { toast.error("Category name required"); return; }
    const r = await catalogsApi.create({ categoryName: catName });
    if (r.isSuccess) {
      toast.success(`Category "${catName}" created`);
      setCatOpen(false);
      setCatName("");
    } else toast.error(r.errorMessage ?? "Create failed");
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Inventory" title="Material Catalog"
        description={isLive ? "Live material catalog from backend." : "Suppliers update stock here. Variants tracked individually."}
        actions={
          isLive ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setCatOpen(true)}>
                <Tags className="h-3.5 w-3.5 mr-1" /> New category
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={() => setMatOpen(true)}>
                <PackagePlus className="h-3.5 w-3.5 mr-1" /> Add material
              </Button>
            </div>
          ) : (
            <Button size="sm" className="h-8 text-xs" onClick={() => toast.info("Add material — sign in to use real API")}>
              <PackagePlus className="h-3.5 w-3.5 mr-1" /> Add material
            </Button>
          )
        }
      />

      {/* Add Material dialog */}
      <Dialog open={matOpen} onOpenChange={setMatOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Material name</Label>
              <Input value={matForm.materialName} onChange={(e) => setMatForm((f) => ({ ...f, materialName: e.target.value }))} placeholder="Portland Cement OPC 43" />
            </div>
            <div><Label>Unit</Label>
              <Input value={matForm.unit} onChange={(e) => setMatForm((f) => ({ ...f, unit: e.target.value }))} placeholder="bags / kg / m³" />
            </div>
            <div><Label>Category ID</Label>
              <Input type="number" value={matForm.categoryId} onChange={(e) => setMatForm((f) => ({ ...f, categoryId: e.target.value }))} placeholder="1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatOpen(false)}>Cancel</Button>
            <Button onClick={submitMaterial}>Add material</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Catalog/Category dialog */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
          <div>
            <Label>Category name</Label>
            <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Structural Materials" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatOpen(false)}>Cancel</Button>
            <Button onClick={submitCatalog}>Create category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLive ? (
        isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading materials…</div>
        ) : (
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>ID</TableHead><TableHead>Material</TableHead>
                  <TableHead>Unit</TableHead><TableHead>Category ID</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(liveMaterials ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No materials yet</TableCell></TableRow>
                  )}
                  {(liveMaterials ?? []).map((m) => (
                    <TableRow key={m.materialId}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{m.materialId}</TableCell>
                      <TableCell className="font-medium">{m.materialName}</TableCell>
                      <TableCell className="text-sm">{m.unit}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.categoryId}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="grid lg:grid-cols-2 gap-4 space-y-0">
          {materialTree.map((root) => (
            <Card key={root.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" /> {root.name}
                </CardTitle>
              </CardHeader>
              <CardContent><Tree node={root} depth={0} /></CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Tree({ node, depth }: { node: MaterialNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const isLeaf = !node.children?.length;

  if (depth === 0) {
    return (
      <div className="space-y-1">
        {node.children?.map((c) => <Tree key={c.id} node={c} depth={depth + 1} />)}
      </div>
    );
  }

  if (isLeaf) {
    const low = node.stock != null && node.reorderAt != null && node.stock < node.reorderAt;
    return (
      <div className="flex items-center justify-between rounded-md border px-3 py-2 ml-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm">{node.name}</span>
          {low && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]"><AlertCircle className="h-2.5 w-2.5" /> Low</Badge>}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="tabular-nums text-muted-foreground">Stock {node.stock} {node.unit}</span>
          <Button
            size="sm" variant="outline" className="h-6 text-[11px] px-2"
            onClick={() => toast.success(`Supplier delivery logged: +50 ${node.unit} of ${node.name}`)}
          >
            Receive
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 w-full px-2 py-1.5 hover:bg-muted rounded-md">
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
        <span className="text-sm font-medium">{node.name}</span>
      </button>
      {open && (
        <div className="ml-2 space-y-1 border-l pl-2">
          {node.children?.map((c) => <Tree key={c.id} node={c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}
