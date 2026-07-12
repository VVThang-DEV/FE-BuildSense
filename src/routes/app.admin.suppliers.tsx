import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Link2, Mail, Phone, Plus } from "lucide-react";
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
import { QueryError } from "@/components/query-error";
import { useSession } from "@/lib/session";
import { suppliersApi } from "@/api/suppliers";
import { materialsApi } from "@/api/materials";
import { catalogsApi } from "@/api/catalogs";
import { requireApiResult } from "@/api/client";

export const Route = createFileRoute("/app/admin/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — BuildSense AI" }] }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const session = useSession();
  const isLive = !!session?.token;
  const canManageSuppliers = session?.role === "ADMIN";

  const {
    data: suppliers,
    refetch,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () =>
      requireApiResult(await suppliersApi.getAll(), "Could not load suppliers") ?? [],
    enabled: isLive,
    staleTime: 30_000,
  });

  const { data: materials } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const response = await materialsApi.getAll();
      return requireApiResult(response, "Could not load materials") ?? [];
    },
    enabled: isLive,
    staleTime: 60_000,
  });

  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ companyName: "", contactEmail: "", contactPhone: "" });
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogForm, setCatalogForm] = useState({
    supplierId: "",
    materialId: "",
    unitPrice: "",
    leadTimeDays: "",
  });

  const submitCreate = async () => {
    if (!form.companyName.trim()) {
      toast.error("Company name required");
      return;
    }
    setSaving(true);
    try {
      const r = await suppliersApi.create({
        companyName: form.companyName,
        contactEmail: form.contactEmail || undefined,
        contactPhone: form.contactPhone || undefined,
      });
      if (r.isSuccess) {
        toast.success("Supplier added");
        setCreating(false);
        setForm({ companyName: "", contactEmail: "", contactPhone: "" });
        refetch();
      } else toast.error(r.errorMessage ?? "Create failed");
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setSaving(false);
    }
  };

  const submitCatalog = async () => {
    if (!catalogForm.supplierId || !catalogForm.materialId || !catalogForm.unitPrice) {
      toast.error("Supplier, material and unit price are required");
      return;
    }
    setSaving(true);
    try {
      const response = await catalogsApi.create({
        supplierId: Number(catalogForm.supplierId),
        materialId: Number(catalogForm.materialId),
        unitPrice: Number(catalogForm.unitPrice),
        leadTimeDays: Number(catalogForm.leadTimeDays) || 0,
      });
      if (response.isSuccess) {
        toast.success("Supplier catalog entry added");
        setCatalogOpen(false);
        setCatalogForm({ supplierId: "", materialId: "", unitPrice: "", leadTimeDays: "" });
      } else {
        toast.error(response.errorMessage ?? "Create failed");
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
        title="Suppliers"
        description="Approved vendors used across purchase orders."
        actions={
          isLive && canManageSuppliers ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setCatalogOpen(true)}
              >
                <Link2 className="h-3.5 w-3.5 mr-1" /> Add catalog item
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={() => setCreating(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add supplier
              </Button>
            </div>
          ) : undefined
        }
      />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="supplier-company">Company name</Label>
              <Input
                id="supplier-company"
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                placeholder="Acme Materials Ltd."
              />
            </div>
            <div>
              <Label htmlFor="supplier-email">Contact email</Label>
              <Input
                id="supplier-email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                placeholder="contact@supplier.com"
              />
            </div>
            <div>
              <Label htmlFor="supplier-phone">Phone</Label>
              <Input
                id="supplier-phone"
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                placeholder="+84 98 765 4321"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={saving}>
              {saving ? "Adding..." : "Add supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Supplier Catalog Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label id="catalog-supplier-label">Supplier</Label>
              <Select
                value={catalogForm.supplierId}
                onValueChange={(value) => setCatalogForm((f) => ({ ...f, supplierId: value }))}
              >
                <SelectTrigger aria-labelledby="catalog-supplier-label">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {(suppliers ?? []).map((supplier) => (
                    <SelectItem key={supplier.supplierId} value={String(supplier.supplierId)}>
                      {supplier.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label id="catalog-material-label">Material</Label>
              <Select
                value={catalogForm.materialId}
                onValueChange={(value) => setCatalogForm((f) => ({ ...f, materialId: value }))}
              >
                <SelectTrigger aria-labelledby="catalog-material-label">
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {(materials ?? []).map((material) => (
                    <SelectItem key={material.materialId} value={String(material.materialId)}>
                      {material.materialName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="catalog-price">Unit price</Label>
                <Input
                  id="catalog-price"
                  type="number"
                  min="0"
                  value={catalogForm.unitPrice}
                  onChange={(e) => setCatalogForm((f) => ({ ...f, unitPrice: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="catalog-lead-time">Lead time days</Label>
                <Input
                  id="catalog-lead-time"
                  type="number"
                  min="0"
                  value={catalogForm.leadTimeDays}
                  onChange={(e) => setCatalogForm((f) => ({ ...f, leadTimeDays: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatalogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitCatalog} disabled={saving}>
              {saving ? "Adding..." : "Add catalog item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {!isLive ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Sign in with a real account to view suppliers.
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : isError ? (
            <QueryError
              message={error instanceof Error ? error.message : undefined}
              onRetry={() => refetch()}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(suppliers ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No suppliers yet — add one above
                    </TableCell>
                  </TableRow>
                )}
                {(suppliers ?? []).map((s) => (
                  <TableRow key={s.supplierId}>
                    <TableCell className="font-medium">{s.companyName}</TableCell>
                    <TableCell className="text-sm">
                      {s.contactEmail ? (
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {s.contactEmail}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.contactPhone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {s.contactPhone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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
