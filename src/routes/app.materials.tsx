import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Edit, Layers3, PackagePlus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { QueryError } from "@/components/query-error";
import { useSession } from "@/lib/session";
import { materialsApi, type MaterialResponse } from "@/api/materials";
import { categoriesApi } from "@/api/categories";
import { requireApiResult } from "@/api/client";

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
  const canManageCatalog = session?.role === "ADMIN";
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialResponse | null>(null);
  const [form, setForm] = useState<MaterialForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<MaterialResponse | null>(null);
  const [variantMaterial, setVariantMaterial] = useState<MaterialResponse | null>(null);
  const [variantForm, setVariantForm] = useState({
    variantName: "",
    sku: "",
    brand: "",
    unit: "",
  });

  const {
    data: materials,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const response = await materialsApi.getAll();
      return requireApiResult(response, "Could not load materials") ?? [];
    },
    enabled: isLive,
    staleTime: 30_000,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await categoriesApi.getAll();
      return requireApiResult(response, "Could not load categories") ?? [];
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

    setSaving(true);
    try {
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
        if (!editing && typeof response.result === "object" && response.result) {
          const variantResponse = await materialsApi.createVariant({
            materialId: response.result.materialId,
            variantName: "Standard",
            unit: form.unit.trim(),
            isActive: true,
          });
          if (!variantResponse.isSuccess) {
            toast.warning(
              `Material created, but its standard variant failed: ${variantResponse.errorMessage ?? "add one manually"}`,
            );
          } else {
            toast.success("Material and standard variant added");
          }
        } else {
          toast.success("Material updated");
        }
        setOpen(false);
        setForm(EMPTY_FORM);
        setEditing(null);
        refetch();
      } else {
        toast.error(response.errorMessage ?? "Request failed");
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setSaving(false);
    }
  };

  const openVariant = (material: MaterialResponse) => {
    setVariantMaterial(material);
    setVariantForm({ variantName: "", sku: "", brand: "", unit: material.defaultUnit });
  };

  const submitVariant = async () => {
    if (!variantMaterial || !variantForm.variantName.trim() || !variantForm.unit.trim()) {
      toast.error("Variant name and unit are required");
      return;
    }
    setSaving(true);
    try {
      const response = await materialsApi.createVariant({
        materialId: variantMaterial.materialId,
        variantName: variantForm.variantName.trim(),
        sku: variantForm.sku.trim() || undefined,
        brand: variantForm.brand.trim() || undefined,
        unit: variantForm.unit.trim(),
        isActive: true,
      });
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Could not add variant");
        return;
      }
      toast.success("Material variant added");
      setVariantMaterial(null);
      await refetch();
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setSaving(false);
    }
  };

  const deleteMaterial = async (material: MaterialResponse) => {
    setSaving(true);
    try {
      const response = await materialsApi.delete(material.materialId);
      if (response.isSuccess) {
        toast.success("Material deleted");
        setDeleting(null);
        refetch();
      } else {
        toast.error(response.errorMessage ?? "Delete failed");
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Operations"
        title="Material Catalog"
        description="Materials available for purchase orders and warehouse inventory."
        actions={
          isLive && canManageCatalog ? (
            <Button size="sm" className="h-8 text-xs" onClick={openCreate}>
              <PackagePlus className="h-3.5 w-3.5 mr-1" /> Add material
            </Button>
          ) : undefined
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Material" : "Add Material"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="material-name">Material name</Label>
              <Input
                id="material-name"
                value={form.materialName}
                onChange={(e) => setForm((f) => ({ ...f, materialName: e.target.value }))}
                maxLength={200}
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="material-unit">Unit</Label>
              <Input
                id="material-unit"
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                maxLength={50}
                placeholder="bags / kg / m3"
                disabled={saving}
              />
            </div>
            {!editing && (
              <div>
                <Label id="material-category-label">Category</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(value) => setForm((f) => ({ ...f, categoryId: value }))}
                >
                  <SelectTrigger aria-labelledby="material-category-label">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories ?? []).map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(categories ?? []).length === 0 && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Create a category before adding materials.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving || (!editing && !form.categoryId)}>
              {saving ? "Saving..." : editing ? "Save changes" : "Add material"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!variantMaterial} onOpenChange={(next) => !next && setVariantMaterial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add variant to {variantMaterial?.materialName}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="variant-name">Variant name</Label>
              <Input
                id="variant-name"
                value={variantForm.variantName}
                onChange={(event) =>
                  setVariantForm((current) => ({ ...current, variantName: event.target.value }))
                }
                maxLength={250}
              />
            </div>
            <div>
              <Label htmlFor="variant-unit">Unit</Label>
              <Input
                id="variant-unit"
                value={variantForm.unit}
                onChange={(event) =>
                  setVariantForm((current) => ({ ...current, unit: event.target.value }))
                }
                maxLength={50}
              />
            </div>
            <div>
              <Label htmlFor="variant-sku">SKU</Label>
              <Input
                id="variant-sku"
                value={variantForm.sku}
                onChange={(event) =>
                  setVariantForm((current) => ({ ...current, sku: event.target.value }))
                }
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="variant-brand">Brand</Label>
              <Input
                id="variant-brand"
                value={variantForm.brand}
                onChange={(event) =>
                  setVariantForm((current) => ({ ...current, brand: event.target.value }))
                }
                maxLength={150}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantMaterial(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitVariant} disabled={saving}>
              {saving ? "Adding..." : "Add variant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {!isLive ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Sign in with a real backend account to manage materials.
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading materials...
            </div>
          ) : isError ? (
            <QueryError
              message={error instanceof Error ? error.message : undefined}
              onRetry={() => refetch()}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>Category</TableHead>
                  {canManageCatalog && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(materials ?? []).length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={canManageCatalog ? 6 : 5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No materials yet
                    </TableCell>
                  </TableRow>
                )}
                {(materials ?? []).map((material) => (
                  <TableRow key={material.materialId}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {material.materialId}
                    </TableCell>
                    <TableCell className="font-medium">{material.materialName}</TableCell>
                    <TableCell>{material.unit}</TableCell>
                    <TableCell className="text-sm">
                      {material.variants.length > 0 ? (
                        material.variants.map((variant) => variant.variantName).join(", ")
                      ) : (
                        <span className="text-destructive">No active variant</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {categories?.find((category) => category.id === material.categoryId)
                        ?.categoryName ?? `#${material.categoryId}`}
                    </TableCell>
                    {canManageCatalog && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openVariant(material)}
                            aria-label={`Add variant to ${material.materialName}`}
                          >
                            <Layers3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEdit(material)}
                            aria-label={`Edit ${material.materialName}`}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleting(material)}
                            aria-label={`Delete ${material.materialName}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(nextOpen) => !nextOpen && setDeleting(null)}
        title="Delete material?"
        description={`Delete ${deleting?.materialName ?? "this material"}? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        busy={saving}
        onConfirm={() => deleting && deleteMaterial(deleting)}
      />
    </div>
  );
}
