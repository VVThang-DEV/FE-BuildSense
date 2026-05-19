import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, PlayCircle, AlertTriangle, ArrowRight } from "lucide-react";
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
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Daily Material Check</h1>
        <p className="text-sm text-muted-foreground">
          Compares each project's time-phased material plan against current stock and supplier lead times.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 flex flex-wrap justify-between items-center gap-4">
          <div>
            <p className="text-sm font-medium">Run today's check</p>
            <p className="text-xs text-muted-foreground">Scans 12 projects · 38 material variants · supplier stock feed</p>
          </div>
          <Button onClick={() => { setRan(true); toast.success("Daily check complete — 1 consolidated PO drafted"); }}>
            <PlayCircle className="h-4 w-4" /> Run check now
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Upcoming material needs (next 7 days)</CardTitle></CardHeader>
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
        <Card className="border-ai/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ai" /> AI-drafted consolidated PO
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 border rounded-lg bg-ai/5">
              <AlertTriangle className="h-4 w-4 text-ai mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Red Clay Bricks — {brickTotal} bricks total</p>
                <p className="text-xs text-muted-foreground mt-1">
                  3 separate house requests merged into one BuildMart Supplies PO. Estimated savings ₹4,200.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {brickNeeds.map((b) => (
                    <Badge key={b.id} variant="secondary" className="text-[11px]">
                      {b.project}: {b.qty}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3">
                  <Button asChild size="sm">
                    <a href="/app/procurement">Review in Procurement <ArrowRight className="h-3 w-3" /></a>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
