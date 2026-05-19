import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { wbsRows } from "@/lib/mock-data";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin/wbs")({
  head: () => ({ meta: [{ title: "WBS & Baseline — BuildSense AI" }] }),
  component: WbsPage,
});

function WbsPage() {
  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Admin"
        title="WBS & Baseline"
        description="Define work breakdown, assign budgets per work package and lock the baseline schedule."
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => toast.info("BOQ import — file picker (demo)")}>Import BOQ</Button>
            <Button size="sm" className="h-8 text-xs" onClick={() => toast.success("Baseline locked for this revision")}>Lock baseline</Button>
          </>
        }
      />

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Code</TableHead><TableHead>Work package</TableHead>
              <TableHead className="text-right">Budget (₹)</TableHead>
              <TableHead>Baseline start</TableHead><TableHead>Baseline end</TableHead>
              <TableHead>Actual</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {wbsRows.map((r) => (
                <TableRow key={r.code}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className={r.code.includes(".") ? "pl-6 text-sm" : "font-medium"}>{r.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.budget.toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{r.baselineStart}</TableCell>
                  <TableCell className="text-xs">{r.baselineEnd}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${r.actualPct}%` }} />
                      </div>
                      <span className="text-xs tabular-nums">{r.actualPct}%</span>
                    </div>
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
