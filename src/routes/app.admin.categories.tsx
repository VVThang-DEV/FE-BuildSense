import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
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
import { categoriesApi, type CategoryResponse } from "@/api/categories";

export const Route = createFileRoute("/app/admin/categories")({
  head: () => ({ meta: [{ title: "Categories - BuildSense AI" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const session = useSession();
  const isLive = !!session?.token;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryResponse | null>(null);
  const [categoryName, setCategoryName] = useState("");

  const { data: categories, isLoading, refetch } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await categoriesApi.getAll();
      return response.result ?? [];
    },
    enabled: isLive,
    staleTime: 30_000,
  });

  const openCreate = () => {
    setEditing(null);
    setCategoryName("");
    setOpen(true);
  };

  const openEdit = (category: CategoryResponse) => {
    setEditing(category);
    setCategoryName(category.categoryName);
    setOpen(true);
  };

  const submit = async () => {
    if (!categoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    const response = editing
      ? await categoriesApi.update(editing.id, { categoryName: categoryName.trim() })
      : await categoriesApi.create({ categoryName: categoryName.trim() });

    if (response.isSuccess) {
      toast.success(editing ? "Category updated" : "Category created");
      setOpen(false);
      refetch();
    } else {
      toast.error(response.errorMessage ?? "Request failed");
    }
  };

  const deleteCategory = async (category: CategoryResponse) => {
    if (!window.confirm(`Delete ${category.categoryName}?`)) return;
    const response = await categoriesApi.delete(category.id);
    if (response.isSuccess) {
      toast.success("Category deleted");
      refetch();
    } else {
      toast.error(response.errorMessage ?? "Delete failed");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Setup"
        title="Categories"
        description="Material categories used by the catalog and procurement workflows."
        actions={
          isLive ? (
            <Button size="sm" className="h-8 text-xs" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New category
            </Button>
          ) : undefined
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
          <div>
            <Label>Category name</Label>
            <Input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>{editing ? "Save changes" : "Create category"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {!isLive ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Sign in with a real backend account to manage categories.</div>
          ) : isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading categories...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Materials</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(categories ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No categories yet</TableCell></TableRow>
                )}
                {(categories ?? []).map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{category.id}</TableCell>
                    <TableCell className="font-medium">{category.categoryName}</TableCell>
                    <TableCell className="text-right tabular-nums">{category.totalMaterials}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(category)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteCategory(category)}>
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
