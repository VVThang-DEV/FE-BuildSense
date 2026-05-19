import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { users as initialUsers } from "@/lib/mock-data";
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
  const [users, setUsers] = useState(initialUsers);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("engineer");
  const deactivate = (id: string) => {
    setUsers((u) => u.map((x) => x.id === id ? { ...x, status: "disabled" as const } : x));
    toast.success("User deactivated");
  };
  const resend = (id: string) => { void id; toast.success("Invitation resent"); };
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
                <div><Label>Name</Label><Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Full name" /></div>
                <div><Label>Email</Label><Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@company.com" /></div>
                <div>
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
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
                <Button onClick={() => {
                  if (!inviteName.trim() || !inviteEmail.trim()) { toast.error("Name and email are required"); return; }
                  setOpen(false);
                  setInviteName(""); setInviteEmail(""); setInviteRole("engineer");
                  toast.success(`Invitation sent to ${inviteEmail}`);
                }}>Send invite</Button>
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
              <TableHead>Role</TableHead><TableHead>Project scope</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
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
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {u.status === "invited" && (
                          <DropdownMenuItem onClick={() => resend(u.id)}>Resend invite</DropdownMenuItem>
                        )}
                        {u.status === "active" && (
                          <DropdownMenuItem className="text-destructive" onClick={() => deactivate(u.id)}>Deactivate</DropdownMenuItem>
                        )}
                        {u.status === "disabled" && (
                          <DropdownMenuItem onClick={() => { setUsers((x) => x.map((y) => y.id === u.id ? { ...y, status: "active" as const } : y)); toast.success("User reactivated"); }}>Reactivate</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
