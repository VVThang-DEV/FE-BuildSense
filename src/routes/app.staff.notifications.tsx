import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { notificationRules } from "@/lib/mock-data";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

export const Route = createFileRoute("/app/staff/notifications")({
  head: () => ({ meta: [{ title: "Notification Rules — BuildSense AI" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(notificationRules.map((r) => [r.id, true]))
  );
  const toggle = (id: string) => {
    setEnabled((prev) => {
      const next = !prev[id];
      toast.success(next ? "Rule enabled" : "Rule disabled");
      return { ...prev, [id]: next };
    });
  };
  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Staff"
        title="Notification Rules"
        description="System-wide rules. Customer-facing alerts always route through the customer portal."
      />
      <Card className="shadow-sm">
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
                  <TableCell className="text-right"><Switch checked={enabled[r.id]} onCheckedChange={() => toggle(r.id)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
