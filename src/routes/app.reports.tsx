import { createFileRoute } from "@tanstack/react-router";
import { Download, Calendar, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { reportTemplates, scheduledReports } from "@/lib/mock-data";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports — BuildSense AI" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const download = (n: string) => {
    const blob = new Blob([`BuildSense AI demo report: ${n}\nGenerated ${new Date().toISOString()}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${n.replace(/\s+/g, "-")}.txt`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${n} downloaded`);
  };
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Reports & Exports</h1>
        <p className="text-sm text-muted-foreground">Plan vs Actual reports, exports for clients and investors.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Templates</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {reportTemplates.map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {r.format === "PDF" ? <FileText className="h-4 w-4 text-destructive shrink-0" /> : <FileSpreadsheet className="h-4 w-4 text-success shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground">Last: {r.lastRun} · {r.format}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => download(r.name)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Scheduled</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Report</TableHead><TableHead>When</TableHead><TableHead>Recipients</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {scheduledReports.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-sm">{s.name}</TableCell>
                    <TableCell className="text-xs">{s.cadence}</TableCell>
                    <TableCell className="text-xs">{s.recipients}</TableCell>
                    <TableCell><Switch defaultChecked={s.enabled} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium">Custom report</p>
            <p className="text-xs text-muted-foreground">Build ad-hoc Plan-vs-Actual across cost / schedule / materials.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => download("Custom Plan vs Actual")}>Export PDF</Button>
            <Button variant="outline" size="sm" onClick={() => download("Custom Plan vs Actual")}>Export Excel</Button>
            <Badge variant="secondary">Beta</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
