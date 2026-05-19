import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { notificationRules } from "@/lib/mock-data";

export const Route = createFileRoute("/app/staff/notifications")({
  head: () => ({ meta: [{ title: "Notification Rules — BuildSense AI" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Notification Rules</h1>
        <p className="text-sm text-muted-foreground">System-wide rules. Customer-facing alerts always route through the customer portal.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Event</TableHead><TableHead>Channels</TableHead>
              <TableHead>Recipients</TableHead><TableHead className="text-right">Enabled</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {notificationRules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.event}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {r.channels.map((c) => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.recipients}</TableCell>
                  <TableCell className="text-right"><Switch defaultChecked /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
