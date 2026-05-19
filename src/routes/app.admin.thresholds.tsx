import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { alertThresholds } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";

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
  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Admin"
        title="Inventory & Alert Thresholds"
        description="When breached, AI raises an alert and a notification rule fires."
      />
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
                      <Input defaultValue={t.value} className="h-8 w-20" />
                      <span className="text-xs text-muted-foreground">{t.unit}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className={cn(sev[t.severity as keyof typeof sev])}>{t.severity}</Badge></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="ghost">Save</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
