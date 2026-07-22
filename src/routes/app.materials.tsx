import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Edit, Layers3, PackagePlus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { materialsApi, type MaterialResponse, type MaterialVariantResponse } from "@/api/materials";
import { categoriesApi } from "@/api/categories";
import { requireApiResult } from "@/api/client";
import { useWorkflowSuggestion } from "@/hooks/use-workflow-suggestion";

export const Route = createFileRoute("/app/materials")({
  head: () => ({ meta: [{ title: "Material Catalog - BuildSense AI" }] }),
  component: MaterialsPage,
});

type MaterialForm = {
  materialName: string;
  unit: string;
  categoryId: string;
  description: string;
  isActive: boolean;
};

const EMPTY_FORM: MaterialForm = {
  materialName: "",
  unit: "",
  categoryId: "",
  description: "",
  isActive: true,
};

function MaterialsPage() {
  const session = useSession();
  const suggestNext = useWorkflowSuggestion();
  const isLive = !!session?.token;
  const canManageCatalog = session?.role === "ADMIN";
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialResponse | null>(null);
  const [form, setForm] = useState<MaterialForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<MaterialResponse | null>(null);
  const [variantMaterial, setVariantMaterial] = useState<MaterialResponse | null>(null);
  const [editingVariant, setEditingVariant] = useState<MaterialVariantResponse | null>(null);
  const [deletingVariant, setDeletingVariant] = useState<MaterialVariantResponse | null>(null);
  const [variantForm, setVariantForm] = useState({
    variantName: "",
    sku: "",
    brand: "",
    grade: "",
    size: "",
    color: "",
    specification: "",
    packaging: "",
    unit: "",
    isActive: true,
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
      description: material.description ?? "",
      isActive: material.isActive,
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
            description: form.description.trim() || undefined,
            isActive: form.isActive,
          })
        : await materialsApi.create({
            materialName: form.materialName.trim(),
            unit: form.unit.trim(),
            categoryId: Number(form.categoryId),
            description: form.description.trim() || undefined,
            isActive: form.isActive,
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
            suggestNext({
              message: "Material and standard variant added",
              nextStep: "Add exact sizes, grades, or shapes as variants before purchasing stock.",
              actionLabel: "Manage variants",
              onAction: () => openVariant(response.result),
            });
          }
        } else {
          suggestNext({
            message: "Material updated",
            nextStep: "Review its variants and supplier catalog coverage.",
            to: "/app/admin/suppliers",
            actionLabel: "Check suppliers",
          });
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
    setEditingVariant(null);
    setVariantForm({
      variantName: "",
      sku: "",
      brand: "",
      grade: "",
      size: "",
      color: "",
      specification: "",
      packaging: "",
      unit: material.defaultUnit,
      isActive: true,
    });
  };

  const openEditVariant = (material: MaterialResponse, variant: MaterialVariantResponse) => {
    setVariantMaterial(material);
    setEditingVariant(variant);
    setVariantForm({
      variantName: variant.variantName,
      sku: variant.sku ?? "",
      brand: variant.brand ?? "",
      grade: variant.grade ?? "",
      size: variant.size ?? "",
      color: variant.color ?? "",
      specification: variant.specification ?? "",
      packaging: variant.packaging ?? "",
      unit: variant.unit,
      isActive: variant.isActive,
    });
  };

  const submitVariant = async () => {
    if (!variantMaterial || !variantForm.variantName.trim() || !variantForm.unit.trim()) {
      toast.error("Variant name and unit are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        materialId: variantMaterial.materialId,
        variantName: variantForm.variantName.trim(),
        sku: variantForm.sku.trim() || undefined,
        brand: variantForm.brand.trim() || undefined,
        grade: variantForm.grade.trim() || undefined,
        size: variantForm.size.trim() || undefined,
        color: variantForm.color.trim() || undefined,
        specification: variantForm.specification.trim() || undefined,
        packaging: variantForm.packaging.trim() || undefined,
        unit: variantForm.unit.trim(),
        isActive: variantForm.isActive,
      };
      const response = editingVariant
        ? await materialsApi.updateVariant(editingVariant.variantId, payload)
        : await materialsApi.createVariant(payload);
      if (!response.isSuccess) {
        toast.error(
          response.errorMessage ?? `Could not ${editingVariant ? "update" : "add"} variant`,
        );
        return;
      }
      suggestNext({
        message: editingVariant ? "Material variant updated" : "Material variant added",
        nextStep: "Link this exact variant to a supplier catalog before creating a purchase order.",
        to: "/app/admin/suppliers",
        actionLabel: "Open suppliers",
      });
      setVariantMaterial(null);
      setEditingVariant(null);
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
        suggestNext({
          message: "Material deactivated; historical records were kept",
          nextStep:
            "Review supplier coverage because catalog offers for its variants are now unavailable.",
          to: "/app/admin/suppliers",
          actionLabel: "Review suppliers",
        });
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

  const deactivateVariant = async (variant: MaterialVariantResponse) => {
    setSaving(true);
    try {
      const response = await materialsApi.deleteVariant(variant.variantId);
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Could not deactivate variant");
        return;
      }
      suggestNext({
        message: "Material variant deactivated; historical records were kept",
        nextStep: "Review supplier coverage because offers for this variant are now unavailable.",
        to: "/app/admin/suppliers",
        actionLabel: "Review suppliers",
      });
      setDeletingVariant(null);
      await refetch();
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
            <div>
              <Label htmlFor="material-description">Description</Label>
              <Textarea
                id="material-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                maxLength={1000}
                disabled={saving}
              />
            </div>
            {editing && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label htmlFor="material-active">Active material</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive materials remain visible but cannot receive new variants.
                  </p>
                </div>
                <Switch
                  id="material-active"
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, isActive: checked }))
                  }
                />
              </div>
            )}
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

      <Dialog
        open={!!variantMaterial}
        onOpenChange={(next) => {
          if (!next) {
            setVariantMaterial(null);
            setEditingVariant(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVariant ? "Edit" : "Add"} variant {editingVariant ? "for" : "to"}{" "}
              {variantMaterial?.materialName}
            </DialogTitle>
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
            {(["grade", "size", "color", "packaging"] as const).map((field) => (
              <div key={field}>
                <Label htmlFor={`variant-${field}`} className="capitalize">
                  {field}
                </Label>
                <Input
                  id={`variant-${field}`}
                  value={variantForm[field]}
                  onChange={(event) =>
                    setVariantForm((current) => ({ ...current, [field]: event.target.value }))
                  }
                  maxLength={150}
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <Label htmlFor="variant-specification">Specification</Label>
              <Textarea
                id="variant-specification"
                value={variantForm.specification}
                onChange={(event) =>
                  setVariantForm((current) => ({
                    ...current,
                    specification: event.target.value,
                  }))
                }
                maxLength={1000}
              />
            </div>
            {editingVariant && (
              <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
                <div>
                  <Label htmlFor="variant-active">Active variant</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive variants remain in history but cannot be selected for new work.
                  </p>
                </div>
                <Switch
                  id="variant-active"
                  checked={variantForm.isActive}
                  onCheckedChange={(isActive) =>
                    setVariantForm((current) => ({ ...current, isActive }))
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantMaterial(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitVariant} disabled={saving}>
              {saving ? "Saving..." : editingVariant ? "Save variant" : "Add variant"}
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
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-medium">{material.materialName}</p>
                        {!material.isActive && <Badge variant="outline">Inactive</Badge>}
                      </div>
                      {material.description && (
                        <p className="max-w-xs truncate text-xs text-muted-foreground">
                          {material.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{material.unit}</TableCell>
                    <TableCell className="text-sm">
                      {material.variants.length > 0 ? (
                        <div className="space-y-1">
                          {material.variants.map((variant) => {
                            const attributes = [
                              variant.brand,
                              variant.grade,
                              variant.size,
                              variant.color,
                              variant.packaging,
                            ].filter(Boolean);
                            return (
                              <div key={variant.variantId} className="flex items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <p>{variant.variantName}</p>
                                    {!variant.isActive && <Badge variant="outline">Inactive</Badge>}
                                  </div>
                                  {(attributes.length > 0 || variant.specification) && (
                                    <p className="max-w-md truncate text-xs text-muted-foreground">
                                      {[...attributes, variant.specification]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </p>
                                  )}
                                </div>
                                {canManageCatalog && (
                                  <div className="flex shrink-0 gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={() => openEditVariant(material, variant)}
                                      aria-label={`Edit ${variant.variantName}`}
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    {variant.isActive && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-destructive"
                                        onClick={() => setDeletingVariant(variant)}
                                        aria-label={`Deactivate ${variant.variantName}`}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
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
                            disabled={!material.isActive}
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
                          {material.isActive && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setDeleting(material)}
                              aria-label={`Deactivate ${material.materialName}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
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
        title="Deactivate material?"
        description={`Deactivate ${deleting?.materialName ?? "this material"} and all of its variants? Historical records will remain. The backend will block this while stock or open workflow references exist.`}
        confirmLabel="Deactivate"
        destructive
        busy={saving}
        onConfirm={() => deleting && deleteMaterial(deleting)}
      />
      <ConfirmDialog
        open={!!deletingVariant}
        onOpenChange={(nextOpen) => !nextOpen && setDeletingVariant(null)}
        title="Deactivate material variant?"
        description={`Deactivate ${deletingVariant?.variantName ?? "this variant"}? Historical records will remain. It cannot be deactivated while stock, reservations, open orders, requests, transfers, or active task plans reference it.`}
        confirmLabel="Deactivate"
        destructive
        busy={saving}
        onConfirm={() => deletingVariant && deactivateVariant(deletingVariant)}
      />
    </div>
  );
}
