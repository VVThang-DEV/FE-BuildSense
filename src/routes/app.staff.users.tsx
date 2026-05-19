import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
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
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Admin"
        title="Users & Access"
        description="Manage role-based access and project scope per user."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs"><Plus className="h-3.5 w-3.5 mr-1" /> Invite user</Button>
            </DialogTrigger>
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
        }
      />

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Email</TableHead>
              <TableHead>Role</TableHead><TableHead>Project scope</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                        {u.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </span>
                      <span className="font-medium text-[13px]">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] capitalize">{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.project}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(statusClass[u.status], "capitalize text-[10px]")}>{u.status}</Badge>
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
