import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, Send } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { dailyReports } from "@/lib/mock-data";

export const Route = createFileRoute("/app/site/report")({
  head: () => ({ meta: [{ title: "Daily Report — BuildSense AI" }] }),
  component: ReportPage,
});

function ReportPage() {
  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-1">Field</p>
        <h1 className="text-[22px] font-bold tracking-tight">Daily Site Report</h1>
        <p className="text-sm text-muted-foreground mt-1">Submitted to PM · Visible in customer feed (filtered).</p>
      </div>
      <div className="space-y-5">

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" defaultValue="2025-10-20" /></div>
            <div><Label>Weather</Label><Input defaultValue="Sunny, 32°C" /></div>
          </div>
          <div><Label>Headcount on site</Label><Input type="number" defaultValue={24} /></div>
          <div><Label>Work completed today</Label><Textarea rows={3} placeholder="Brickwork L2 east — 1.4m raised…" /></div>
          <div><Label>Blockers / risks</Label><Textarea rows={2} placeholder="Awaiting Phi 10 steel delivery…" /></div>

          <div>
            <Label>Photos</Label>
            <div className="mt-1 border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
              <Upload className="h-6 w-6 mx-auto mb-2 opacity-60" />
              Tap to add photos from camera / gallery (demo)
            </div>
          </div>

          <Button className="w-full" onClick={() => toast.success("Daily report submitted")}>
            <Send className="h-4 w-4" /> Submit report
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Past reports</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {dailyReports.map((r) => (
            <div key={r.date} className="py-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{r.date}</span>
                <span className="text-xs text-muted-foreground">{r.weather} · {r.headcount} on site</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{r.work}</p>
              {r.blockers !== "—" && <p className="text-xs text-destructive mt-1">Blocker: {r.blockers}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
