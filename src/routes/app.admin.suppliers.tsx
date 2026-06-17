import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Mail, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { useSession } from "@/lib/session";
import { suppliersApi } from "@/api/suppliers";

export const Route = createFileRoute("/app/admin/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — BuildSense AI" }] }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const session = useSession();
  const isLive = !!session?.token;

  const { data: suppliers, refetch, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => { const r = await suppliersApi.getAll(); return r.result ?? []; },
    enabled: isLive,
    staleTime: 30_000,
  });

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ companyName: "", contactEmail: "", contactPhone: "" });

  const submitCreate = async () => {
    if (!form.companyName.trim()) { toast.error("Company name required"); return; }
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
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Operations"
        title="Suppliers"
        description="Approved vendors used across purchase orders."
        actions={
          isLive ? (
            <Button size="sm" className="h-8 text-xs" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add supplier
            </Button>
          ) : undefined
        }
      />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Company name</Label>
              <Input
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                placeholder="Acme Materials Ltd."
              />
            </div>
            <div>
              <Label>Contact email</Label>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                placeholder="contact@supplier.com"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                placeholder="+84 98 765 4321"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={submitCreate}>Add supplier</Button>
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
                      {s.contactEmail
                        ? <span className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-muted-foreground" />{s.contactEmail}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.contactPhone
                        ? <span className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-muted-foreground" />{s.contactPhone}</span>
                        : <span className="text-muted-foreground">—</span>}
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
