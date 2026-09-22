import { createFileRoute, Link } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/app/supplier/orders")({
  head: () => ({ meta: [{ title: "Supplier Orders (Retired) - BuildSense AI" }] }),
  component: RetiredSupplierOrdersPage,
});

// SUPPLIER is a retired role: accounts are locked out, ADMIN can no longer
// assign it, and procurement writes return HTTP 410.
function RetiredSupplierOrdersPage() {
  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader
        section="Supplier"
        title="Purchase Orders"
        description="This feature has been retired."
      />
      <Card className="shadow-sm">
        <CardContent className="flex flex-col items-center p-10 text-center">
          <Store className="mb-3 h-9 w-9 text-muted-foreground" />
          <p className="font-medium">Supplier orders are no longer available</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            The supplier role was retired and all purchase-order write endpoints return HTTP 410
            Gone.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/app/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
