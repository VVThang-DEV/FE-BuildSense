import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/session";
import {
  usersApi,
  BACKEND_ROLE_LABEL,
  BACKEND_ROLE_VALUE,
  USER_MANAGEMENT_ROLES,
  type BackendRole,
} from "@/api/users";
import { authApi } from "@/api/auth";
import { requireApiResult } from "@/api/client";

export const Route = createFileRoute("/app/staff/users")({
  head: () => ({ meta: [{ title: "Users & Access - BuildSense AI" }] }),
  component: UsersPage,
});

function UsersPage() {
  const session = useSession();
  const isLive = !!session?.token;
  const [open, setOpen] = useState(false);
  const [invLoading, setInvLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [inv, setInv] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: BackendRole;
  }>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "PM",
  });

  const {
    data: liveUsers,
    refetch,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await usersApi.getAll();
      return requireApiResult(response, "Could not load users") ?? [];
    },
    enabled: isLive,
    staleTime: 30_000,
  });

  const submitInvite = async () => {
    if (!inv.firstName.trim() || !inv.email.trim() || !inv.password.trim()) {
      toast.error("First name, email and password are required");
      return;
    }
    if (inv.password !== inv.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setInvLoading(true);
    try {
      const response = await authApi.register({
        email: inv.email,
        password: inv.password,
        confirmPassword: inv.confirmPassword,
        firstName: inv.firstName,
        lastName: inv.lastName,
        role: BACKEND_ROLE_VALUE[inv.role],
      });
      if (response.isSuccess) {
        toast.success(`Account created for ${inv.email}`);
        setOpen(false);
        setInv({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "PM",
        });
        refetch();
      } else {
        const errorMessage = response.errorMessage ?? "Registration failed";
        const emailDeliveryIssue = /verification email|send.*email/i.test(errorMessage);

        if (emailDeliveryIssue) {
          const usersResponse = await usersApi.getAll();
          const normalizedEmail = inv.email.trim().toLowerCase();
          const accountWasCreated =
            usersResponse.isSuccess &&
            usersResponse.result.some(
              (user) => user.email.trim().toLowerCase() === normalizedEmail,
            );

          if (accountWasCreated) {
            toast.warning(
              `Account created for ${inv.email}. The backend reported a verification-email issue; check the inbox before retrying. The user must verify the email before signing in`,
            );
            setOpen(false);
            setInv({
              firstName: "",
              lastName: "",
              email: "",
              password: "",
              confirmPassword: "",
              role: "PM",
            });
            await refetch();
            return;
          }
        }

        toast.error(errorMessage);
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setInvLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Admin"
        title="Users & Access"
        description="Manage backend accounts and role-based access."
        actions={
          isLive ? (
            <Button size="sm" className="h-8 text-xs" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create account
            </Button>
          ) : undefined
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Account</DialogTitle>
            <DialogDescription>
              Add a backend user and send a verification email to activate their account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="account-first-name">First name</Label>
              <Input
                id="account-first-name"
                value={inv.firstName}
                onChange={(e) => setInv((f) => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="account-last-name">Last name</Label>
              <Input
                id="account-last-name"
                value={inv.lastName}
                onChange={(e) => setInv((f) => ({ ...f, lastName: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-3 mt-1">
            <div>
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                type="email"
                value={inv.email}
                onChange={(e) => setInv((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="account-password">Password</Label>
              <Input
                id="account-password"
                type="password"
                value={inv.password}
                onChange={(e) => setInv((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="account-confirm-password">Confirm password</Label>
              <Input
                id="account-confirm-password"
                type="password"
                value={inv.confirmPassword}
                onChange={(e) => setInv((f) => ({ ...f, confirmPassword: e.target.value }))}
              />
            </div>
            <div>
              <Label id="account-role-label">Role</Label>
              <Select
                value={inv.role}
                onValueChange={(value) => setInv((f) => ({ ...f, role: value as BackendRole }))}
              >
                <SelectTrigger aria-labelledby="account-role-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_MANAGEMENT_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {BACKEND_ROLE_LABEL[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={invLoading}>
              Cancel
            </Button>
            <Button onClick={submitInvite} disabled={invLoading}>
              {invLoading ? "Creating..." : "Create account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {!isLive ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Sign in with a real backend account to manage users.
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading users...</div>
          ) : isError ? (
            <QueryError
              message={error instanceof Error ? error.message : undefined}
              onRetry={() => refetch()}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(liveUsers ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No users yet
                    </TableCell>
                  </TableRow>
                )}
                {(liveUsers ?? []).map((user) => {
                  const fullName = `${user.firstName} ${user.lastName}`.trim();
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                            {fullName
                              .split(" ")
                              .map((name) => name[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                          <span className="font-medium text-[13px]">{fullName || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {BACKEND_ROLE_LABEL[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              aria-label={`Change role for ${fullName || user.email}`}
                              disabled={updatingUserId === user.id}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                              Change role to:
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {USER_MANAGEMENT_ROLES.filter((role) => role !== user.role).map(
                              (role) => (
                                <DropdownMenuItem
                                  key={role}
                                  onClick={async () => {
                                    setUpdatingUserId(user.id);
                                    try {
                                      const response = await usersApi.updateRole(user.id, {
                                        role: BACKEND_ROLE_VALUE[role],
                                      });
                                      if (response.isSuccess) {
                                        toast.success(
                                          `${fullName || user.email} is now ${BACKEND_ROLE_LABEL[role]}`,
                                        );
                                        refetch();
                                      } else {
                                        toast.error(response.errorMessage ?? "Update failed");
                                      }
                                    } catch {
                                      toast.error("Could not reach the backend");
                                    } finally {
                                      setUpdatingUserId(null);
                                    }
                                  }}
                                >
                                  {BACKEND_ROLE_LABEL[role]}
                                </DropdownMenuItem>
                              ),
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
