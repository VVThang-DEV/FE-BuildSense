import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { attendance } from "@/lib/mock-data";

export const Route = createFileRoute("/app/site/attendance")({
  head: () => ({ meta: [{ title: "Attendance — BuildSense AI" }] }),
  component: AttendancePage,
});

function AttendancePage() {
  const total = attendance.reduce((s, a) => s + a.hours, 0).toFixed(1);
  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold">Attendance</h1>
        <p className="text-sm text-muted-foreground">Geo-tagged check-in/out · Villa 12 site</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">This week</p><p className="text-xl font-semibold">{total}h</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Days</p><p className="text-xl font-semibold">{attendance.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg/day</p><p className="text-xl font-semibold">{(Number(total) / attendance.length).toFixed(1)}h</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Log</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Site</TableHead>
              <TableHead>In</TableHead><TableHead>Out</TableHead><TableHead className="text-right">Hours</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {attendance.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.date}</TableCell>
                  <TableCell>{a.site}</TableCell>
                  <TableCell className="tabular-nums">{a.checkIn}</TableCell>
                  <TableCell className="tabular-nums">{a.checkOut}</TableCell>
                  <TableCell className="text-right tabular-nums">{a.hours}h</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
