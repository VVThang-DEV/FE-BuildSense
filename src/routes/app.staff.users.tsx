import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { users as initialUsers } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { usersApi, BACKEND_ROLE_LABEL } from "@/api/users";
import { authApi } from "@/api/auth";

export const Route = createFileRoute("/app/staff/users")({
  head: () => ({ meta: [{ title: "Users & Access  BuildSense AI" }] }),
  component: UsersPage,
});

const statusClass = {
  active:   "bg-success/15 text-success border-success/30",
  invited:  "bg-warning/20 text-warning-foreground border-warning/40",
  disabled: "bg-muted text-muted-foreground",
} as const;

function UsersPage() {
  const session = useSession();
  const isLive = !!session?.token && session.role === "manager";

  const { data: liveUsers, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: async () => { const r = await usersApi.getAll(); return r.result ?? []; },
    enabled: isLive,
    staleTime: 30_000,
  });

  // Live invite state
  const [open, setOpen] = useState(false);
  const [inv, setInv] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "", role: "2" });
  const [invLoading, setInvLoading] = useState(false);

  const submitInvite = async () => {
    if (!inv.firstName.trim() || !inv.email.trim() || !inv.password.trim()) { toast.error("First name, email and password are required"); return; }
    if (inv.password !== inv.confirmPassword) { toast.error("Passwords do not match"); return; }
    setInvLoading(true);
    try {
      const r = await authApi.register({ email: inv.email, password: inv.password, confirmPassword: inv.confirmPassword, firstName: inv.firstName, lastName: inv.lastName, role: Number(inv.role) });
      if (r.isSuccess) {
        toast.success(`Account created for ${inv.email}`);
        setOpen(false);
        setInv({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "", role: "2" });
        refetch();
      } else toast.error(r.errorMessage ?? "Registration failed");
    } finally { setInvLoading(false); }
  };

  // Demo state
  const [users, setUsers] = useState(initialUsers);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("engineer");

  const deactivate = (id: string) => { setUsers((u) => u.map((x) => x.id === id ? { ...x, status: "disabled" as const } : x)); toast.success("User deactivated"); };
  const resend = (id: string) => { void id; toast.success("Invitation resent"); };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Admin" title="Users & Access"
        description="Manage role-based access per user."
        actions={
          <Button size="sm" className="h-8 text-xs" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />{isLive ? "Create account" : "Invite user"}
          </Button>
        }
      />

      {isLive ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create account</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First name</Label><Input value={inv.firstName} onChange={(e) => setInv((f) => ({ ...f, firstName: e.target.value }))} placeholder="Nguyen" /></div>
              <div><Label>Last name</Label><Input value={inv.lastName} onChange={(e) => setInv((f) => ({ ...f, lastName: e.target.value }))} placeholder="Van A" /></div>
            </div>
            <div className="space-y-3 mt-1">
              <div><Label>Email</Label><Input type="email" value={inv.email} onChange={(e) => setInv((f) => ({ ...f, email: e.target.value }))} placeholder="user@company.com" /></div>
              <div><Label>Password</Label><Input type="password" value={inv.password} onChange={(e) => setInv((f) => ({ ...f, password: e.target.value }))} /></div>
              <div><Label>Confirm password</Label><Input type="password" value={inv.confirmPassword} onChange={(e) => setInv((f) => ({ ...f, confirmPassword: e.target.value }))} /></div>
              <div><Label>Role</Label>
                <Select value={inv.role} onValueChange={(v) => setInv((f) => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Admin</SelectItem>
                    <SelectItem value="1">Project Manager</SelectItem>
                    <SelectItem value="2">Field Engineer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submitInvite} disabled={invLoading}>{invLoading ? "Creating..." : "Create account"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite teammate</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Full name" /></div>
              <div><Label>Email</Label><Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@company.com" /></div>
              <div><Label>Role</Label>
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
                setOpen(false); setInviteName(""); setInviteEmail(""); setInviteRole("engineer");
                toast.success(`Invitation sent to ${inviteEmail}`);
              }}>Send invite</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLive ? (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead>
                <TableHead>Role</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(liveUsers ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users yet</TableCell></TableRow>}
                {(liveUsers ?? []).map((u) => {
                  const fullName = `${u.firstName} ${u.lastName}`.trim();
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                            {fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                          <span className="font-medium text-[13px]">{fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{BACKEND_ROLE_LABEL[u.role] ?? u.role}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] bg-success/12 text-success border-success/30">Active</Badge></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled className="text-xs text-muted-foreground">Change role to:</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {Object.entries(BACKEND_ROLE_LABEL).filter(([k]) => Number(k) !== u.role).map(([k, label]) => (
                              <DropdownMenuItem key={k} onClick={async () => {
                                const r = await usersApi.updateRole(u.id, { role: Number(k) });
                                if (r.isSuccess) { toast.success(`${fullName} is now ${label}`); refetch(); }
                                else toast.error(r.errorMessage ?? "Update failed");
                              }}>{label}</DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead>
                <TableHead>Role</TableHead><TableHead>Project scope</TableHead>
                <TableHead>Status</TableHead><TableHead></TableHead>
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
                    <TableCell><Badge variant="secondary" className="text-[10px] capitalize">{u.role}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.project}</TableCell>
                    <TableCell><Badge variant="outline" className={cn(statusClass[u.status], "capitalize text-[10px]")}>{u.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {u.status === "invited" && <DropdownMenuItem onClick={() => resend(u.id)}>Resend invite</DropdownMenuItem>}
                          {u.status === "active" && <DropdownMenuItem className="text-destructive" onClick={() => deactivate(u.id)}>Deactivate</DropdownMenuItem>}
                          {u.status === "disabled" && <DropdownMenuItem onClick={() => { setUsers((x) => x.map((y) => y.id === u.id ? { ...y, status: "active" as const } : y)); toast.success("User reactivated"); }}>Reactivate</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
