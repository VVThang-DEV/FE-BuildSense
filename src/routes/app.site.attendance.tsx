import { createFileRoute } from "@tanstack/react-router";
import { Download, MapPin, TrendingUp, Clock, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { attendance } from "@/lib/mock-data";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { MockDataBanner } from "@/components/mock-banner";

export const Route = createFileRoute("/app/site/attendance")({
  head: () => ({ meta: [{ title: "Attendance — BuildSense AI" }] }),
  component: AttendancePage,
});

const EXPECTED_HOURS = 9.0;

function AttendancePage() {
  const total = attendance.reduce((s, a) => s + a.hours, 0);
  const avg = total / attendance.length;
  const overtime = attendance.reduce((s, a) => s + Math.max(0, a.hours - EXPECTED_HOURS), 0);

  // Weekly bar chart data (Mon–Sun, fill with attendance)
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayHours: Record<string, number> = {
    Mon: 9.1, Tue: 8.4, Wed: 9.1, Thu: 9.3, Fri: 9.2, Sat: 0, Sun: 0,
  };

  const getStatus = (checkIn: string) => {
    const [h, m] = checkIn.split(":").map(Number);
    const mins = h * 60 + m;
    if (mins <= 8 * 60) return { label: "On Time", cls: "bg-success/10 text-success border-success/25" };
    if (mins <= 8 * 60 + 20) return { label: "Slight Delay", cls: "bg-warning/15 text-warning-foreground border-warning/30" };
    return { label: "Late", cls: "bg-destructive/10 text-destructive border-destructive/25" };
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <PageHeader
        section="Field"
        title="Attendance"
        description="Geo-tagged check-in / out · Villa 12 site"
        actions={
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => toast.success("Attendance CSV exported")}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
        }
      />
      <MockDataBanner message="Demo data — all attendance records and charts are sample data." />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/8 mb-2"><Clock className="h-3.5 w-3.5 text-primary" /></div>
            <p className="text-xl font-bold tabular-nums">{total.toFixed(1)}h</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ai/8 mb-2"><CalendarCheck className="h-3.5 w-3.5 text-ai" /></div>
            <p className="text-xl font-bold tabular-nums">{attendance.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Days attended</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 mb-2"><TrendingUp className="h-3.5 w-3.5 text-success" /></div>
            <p className="text-xl font-bold tabular-nums">{avg.toFixed(1)}h</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Daily average</p>
          </CardContent>
        </Card>
        <Card className="border-warning/30">
          <CardContent className="p-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10 mb-2"><Clock className="h-3.5 w-3.5 text-warning-foreground" /></div>
            <p className="text-xl font-bold tabular-nums text-warning-foreground">{overtime.toFixed(1)}h</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Overtime</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly bar chart */}
      <Card className="mb-5 shadow-sm">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-[14px] font-semibold">This Week — Hours per Day</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-end gap-2 h-24">
            {weekDays.map((day) => {
              const h = dayHours[day] ?? 0;
              const pct = (h / 10) * 100;
              const isToday = day === "Fri";
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground tabular-nums">{h > 0 ? `${h}h` : "—"}</span>
                  <div className="w-full rounded-t-md overflow-hidden" style={{ height: `${Math.max(pct, 4)}%`, maxHeight: "56px", minHeight: h > 0 ? "8px" : "2px" }}>
                    <div className={cn("w-full h-full rounded-t-md", isToday ? "bg-primary" : h > 0 ? "bg-primary/40" : "bg-muted")} />
                  </div>
                  <span className={cn("text-[10px] font-medium", isToday ? "text-primary" : "text-muted-foreground")}>{day}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-3 text-[10.5px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary inline-block" /> Today</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary/40 inline-block" /> Worked</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-muted inline-block" /> Weekend</span>
          </div>
        </CardContent>
      </Card>

      {/* Site location card */}
      <Card className="mb-5 border-primary/20">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold">Villa 12 — Plot 7, Sector B</p>
            <p className="text-[11px] text-muted-foreground">12°58′N 80°15′E · Check-in radius 100 m</p>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success/25 text-[11px] shrink-0">Within zone</Badge>
        </CardContent>
      </Card>

      {/* Log table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 border-b"><CardTitle className="text-[14px] font-semibold">Check-in / Out Log</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.map((a) => {
                const status = getStatus(a.checkIn);
                const over = a.hours > EXPECTED_HOURS;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.date}</TableCell>
                    <TableCell className="tabular-nums">{a.checkIn}</TableCell>
                    <TableCell className="tabular-nums">{a.checkOut}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={cn("font-medium", over ? "text-warning-foreground" : "")}>{a.hours}h</span>
                      {over && <span className="text-[10px] text-warning-foreground ml-1">+{(a.hours - EXPECTED_HOURS).toFixed(1)}h OT</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px]", status.cls)}>{status.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
