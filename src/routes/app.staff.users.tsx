import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { users } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/staff/users")({
  head: () => ({ meta: [{ title: "Users & Access — BuildSense AI" }] }),
  component: UsersPage,
});

const statusClass = {
  active: "bg-success/15 text-success border-success/30",
  invited: "bg-warning/20 text-warning-foreground border-warning/40",
  disabled: "bg-muted text-muted-foreground",
} as const;

function UsersPage() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Users & Access</h1>
          <p className="text-sm text-muted-foreground">Manage role-based access and project scope per user.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5" /> Invite user</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite teammate</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input /></div>
              <div><Label>Email</Label><Input type="email" /></div>
              <div>
                <Label>Role</Label>
                <Select defaultValue="engineer">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Project Manager</SelectItem>
                    <SelectItem value="staff">System Staff</SelectItem>
                    <SelectItem value="engineer">Field Engineer</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => { setOpen(false); toast.success("Invitation sent"); }}>Send invite</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Email</TableHead>
              <TableHead>Role</TableHead><TableHead>Project scope</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
                  <TableCell className="text-xs">{u.project}</TableCell>
                  <TableCell><Badge variant="outline" className={cn(statusClass[u.status])}>{u.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
