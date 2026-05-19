import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, PlayCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { upcomingNeeds } from "@/lib/mock-data";

export const Route = createFileRoute("/app/check")({
  head: () => ({ meta: [{ title: "Daily Check — BuildSense AI" }] }),
  component: DailyCheck,
});

function DailyCheck() {
  const [ran, setRan] = useState(false);

  // Group bricks: 500+300+200 = 1000
  const brickNeeds = upcomingNeeds.filter((n) => n.material === "Red Clay Bricks");
  const brickTotal = brickNeeds.reduce((s, n) => s + n.qty, 0);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Operations"
        title="Daily Material Check"
        description="Compares each project's time-phased material plan against current stock and supplier lead times."
      />

      <div className="space-y-4">
        <Card className="shadow-sm">
          <CardContent className="p-5 flex flex-wrap justify-between items-center gap-4">
            <div>
              <p className="text-[13px] font-semibold">Run today's check</p>
              <p className="text-xs text-muted-foreground mt-0.5">Scans 12 projects · 38 material variants · supplier stock feed</p>
            </div>
            <Button className="h-8 text-xs" onClick={() => { setRan(true); toast.success("Daily check complete — 1 consolidated PO drafted"); }}>
              <PlayCircle className="h-4 w-4 mr-1" /> Run check now
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-[14px] font-semibold">Upcoming material needs (next 7 days)</CardTitle>
          </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Project</TableHead><TableHead>Material</TableHead>
              <TableHead className="text-right">Qty</TableHead><TableHead>Needed by</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {upcomingNeeds.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.project}</TableCell>
                  <TableCell>{n.material}</TableCell>
                  <TableCell className="text-right tabular-nums">{n.qty} {n.unit}</TableCell>
                  <TableCell className="text-xs">{n.neededBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {ran && (
        <Card className="border-ai/25 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-[14px] font-semibold flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-ai/10">
                <Sparkles className="h-3.5 w-3.5 text-ai" />
              </div>
              AI-drafted consolidated PO
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-3">
            <div className="flex items-start gap-3 p-3.5 border border-ai/20 rounded-xl bg-ai/5">
              <AlertTriangle className="h-4 w-4 text-ai mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-[13px] font-semibold">Red Clay Bricks — {brickTotal} bricks total</p>
                <p className="text-xs text-muted-foreground mt-1">
                  3 separate house requests merged into one BuildMart Supplies PO. Estimated savings ₹4,200.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {brickNeeds.map((b) => (
                    <Badge key={b.id} variant="secondary" className="text-[10px]">
                      {b.project}: {b.qty}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3">
                  <Button asChild size="sm" className="h-7 text-xs">
                    <a href="/app/procurement">Review in Procurement <ArrowRight className="h-3 w-3 ml-1" /></a>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
