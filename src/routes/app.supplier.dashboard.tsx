import { createFileRoute, Link } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/app/supplier/dashboard")({
  head: () => ({ meta: [{ title: "Supplier Dashboard (Retired) - BuildSense AI" }] }),
  component: RetiredSupplierDashboardPage,
});

// SUPPLIER is a retired role: accounts are locked out and ADMIN can no
// longer assign it.
function RetiredSupplierDashboardPage() {
  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader
        section="Supplier"
        title="Supplier Dashboard"
        description="This feature has been retired."
      />
      <Card className="shadow-sm">
        <CardContent className="flex flex-col items-center p-10 text-center">
          <Store className="mb-3 h-9 w-9 text-muted-foreground" />
          <p className="font-medium">Supplier workspace is no longer available</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            The supplier role was retired. Supplier and catalog records remain as admin-managed
            reference data under Suppliers and Material Catalog.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/app/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
