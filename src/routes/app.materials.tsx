import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Package, PackagePlus, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { materialTree, type MaterialNode } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/app/materials")({
  head: () => ({ meta: [{ title: "Material Catalog — BuildSense AI" }] }),
  component: MaterialsPage,
});

function MaterialsPage() {
  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Inventory"
        title="Material Catalog"
        description="Suppliers update stock here. Variants tracked individually — e.g. Steel ▸ Concrete Steel ▸ Phi 5 / 10 / 20."
        actions={<Button size="sm" className="h-8 text-xs" onClick={() => toast.info("Add material dialog (demo — connect to form)")}><PackagePlus className="h-3.5 w-3.5 mr-1" /> Add material</Button>}
      />

      <div className="grid lg:grid-cols-2 gap-4 space-y-0">
        {materialTree.map((root) => (
          <Card key={root.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> {root.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tree node={root} depth={0} />
            </CardContent>
          </Card>
        ))}
      </div>
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
