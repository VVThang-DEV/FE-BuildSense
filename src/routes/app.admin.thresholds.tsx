import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { alertThresholds } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { MockDataBanner } from "@/components/mock-banner";

export const Route = createFileRoute("/app/admin/thresholds")({
  head: () => ({ meta: [{ title: "Inventory Thresholds — BuildSense AI" }] }),
  component: ThresholdsPage,
});

const sev = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-warning/20 text-warning-foreground border-warning/40",
  low: "bg-muted text-muted-foreground",
} as const;

function ThresholdsPage() {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(alertThresholds.map((t) => [t.id, t.value]))
  );
  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Admin"
        title="Inventory & Alert Thresholds"
        description="When breached, AI raises an alert and a notification rule fires."
      />
      <MockDataBanner message="Demo data — all thresholds are sample data. Changes are not persisted." />
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Metric</TableHead><TableHead>Threshold</TableHead><TableHead>Severity</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {alertThresholds.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.metric}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        value={values[t.id]}
                        onChange={(e) => setValues((v) => ({ ...v, [t.id]: Number(e.target.value) }))}
                        className="h-8 w-20"
                        type="number"
                      />
                      <span className="text-xs text-muted-foreground">{t.unit}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(sev[t.severity as keyof typeof sev], "capitalize")}>{t.severity}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toast.success(`Threshold for “${t.metric}” saved`)}>Save</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
