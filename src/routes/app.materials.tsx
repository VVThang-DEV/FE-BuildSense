import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Edit, PackagePlus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useSession } from "@/lib/session";
import { materialsApi, type MaterialResponse } from "@/api/materials";
import { categoriesApi } from "@/api/categories";

export const Route = createFileRoute("/app/materials")({
  head: () => ({ meta: [{ title: "Material Catalog - BuildSense AI" }] }),
  component: MaterialsPage,
});

type MaterialForm = {
  materialName: string;
  unit: string;
  categoryId: string;
};

const EMPTY_FORM: MaterialForm = { materialName: "", unit: "", categoryId: "" };

function MaterialsPage() {
  const session = useSession();
  const isLive = !!session?.token;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialResponse | null>(null);
  const [form, setForm] = useState<MaterialForm>(EMPTY_FORM);

  const { data: materials, isLoading, refetch } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const response = await materialsApi.getAll();
      return response.result ?? [];
    },
    enabled: isLive,
    staleTime: 30_000,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await categoriesApi.getAll();
      return response.result ?? [];
    },
    enabled: isLive,
    staleTime: 60_000,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, categoryId: categories?.[0] ? String(categories[0].id) : "" });
    setOpen(true);
  };

  const openEdit = (material: MaterialResponse) => {
    setEditing(material);
    setForm({
      materialName: material.materialName,
      unit: material.unit,
      categoryId: String(material.categoryId),
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.materialName.trim() || !form.unit.trim()) {
      toast.error("Material name and unit are required");
      return;
    }

    const response = editing
      ? await materialsApi.update(editing.materialId, {
          materialName: form.materialName.trim(),
          unit: form.unit.trim(),
        })
      : await materialsApi.create({
          materialName: form.materialName.trim(),
          unit: form.unit.trim(),
          categoryId: Number(form.categoryId),
        });

    if (response.isSuccess) {
      toast.success(editing ? "Material updated" : "Material added");
      setOpen(false);
      setForm(EMPTY_FORM);
      setEditing(null);
      refetch();
    } else {
      toast.error(response.errorMessage ?? "Request failed");
    }
  };

  const deleteMaterial = async (material: MaterialResponse) => {
    if (!window.confirm(`Delete ${material.materialName}?`)) return;
    const response = await materialsApi.delete(material.materialId);
    if (response.isSuccess) {
      toast.success("Material deleted");
      refetch();
    } else {
      toast.error(response.errorMessage ?? "Delete failed");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Operations"
        title="Material Catalog"
        description="Materials available for purchase orders and warehouse inventory."
        actions={
          isLive ? (
            <Button size="sm" className="h-8 text-xs" onClick={openCreate}>
              <PackagePlus className="h-3.5 w-3.5 mr-1" /> Add material
            </Button>
          ) : undefined
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Material" : "Add Material"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Material name</Label>
              <Input value={form.materialName} onChange={(e) => setForm((f) => ({ ...f, materialName: e.target.value }))} />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="bags / kg / m3" />
            </div>
            {!editing && (
              <div>
                <Label>Category</Label>
                <Select value={form.categoryId} onValueChange={(value) => setForm((f) => ({ ...f, categoryId: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {(categories ?? []).map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>{category.categoryName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(categories ?? []).length === 0 && (
                  <p className="mt-1.5 text-xs text-muted-foreground">Create a category before adding materials.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!editing && !form.categoryId}>{editing ? "Save changes" : "Add material"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {!isLive ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Sign in with a real backend account to manage materials.</div>
          ) : isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading materials...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(materials ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No materials yet</TableCell></TableRow>
                )}
                {(materials ?? []).map((material) => (
                  <TableRow key={material.materialId}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{material.materialId}</TableCell>
                    <TableCell className="font-medium">{material.materialName}</TableCell>
                    <TableCell>{material.unit}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {categories?.find((category) => category.id === material.categoryId)?.categoryName ?? `#${material.categoryId}`}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(material)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteMaterial(material)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
