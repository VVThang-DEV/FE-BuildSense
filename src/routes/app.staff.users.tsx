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
    if (
      !inv.firstName.trim() ||
      !inv.lastName.trim() ||
      !inv.email.trim() ||
      !inv.password.trim()
    ) {
      toast.error("First name, last name, email, and password are required");
      return;
    }
    if (inv.password !== inv.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inv.email.trim())) {
      toast.error("Enter a valid email address");
      return;
    }
    if (
      inv.password.length < 10 ||
      inv.password.length > 128 ||
      !/[a-z]/.test(inv.password) ||
      !/[A-Z]/.test(inv.password) ||
      !/\d/.test(inv.password)
    ) {
      toast.error("Use 10-128 characters with uppercase, lowercase, and a number");
      return;
    }
    setInvLoading(true);
    try {
      const response = await authApi.register({
        email: inv.email.trim(),
        password: inv.password,
        confirmPassword: inv.confirmPassword,
        firstName: inv.firstName.trim(),
        lastName: inv.lastName.trim(),
      });
      // Registration intentionally creates CUSTOMER accounts. Promote the new
      // account through the admin-only role endpoint after it has an ID.
      const createdUserId = typeof response.result === "number" ? response.result : 0;
      if (createdUserId > 0) {
        const roleResponse = await usersApi.updateRole(createdUserId, {
          role: BACKEND_ROLE_VALUE[inv.role],
        });
        if (!roleResponse.isSuccess) {
          toast.warning(
            `Account #${createdUserId} was created, but its role is still CUSTOMER: ${roleResponse.errorMessage ?? "role update failed"}`,
          );
          await refetch();
          return;
        }

        if (response.isSuccess) {
          toast.success(`Account created for ${inv.email} as ${BACKEND_ROLE_LABEL[inv.role]}`);
        } else {
          toast.warning(
            `Account and role were created, but the verification email was not sent. Use resend verification before sign-in.`,
          );
        }
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
      } else {
        toast.error(response.errorMessage ?? "Registration failed");
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
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="account-last-name">Last name</Label>
              <Input
                id="account-last-name"
                value={inv.lastName}
                onChange={(e) => setInv((f) => ({ ...f, lastName: e.target.value }))}
                maxLength={100}
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
                maxLength={150}
              />
            </div>
            <div>
              <Label htmlFor="account-password">Password</Label>
              <Input
                id="account-password"
                type="password"
                value={inv.password}
                onChange={(e) => setInv((f) => ({ ...f, password: e.target.value }))}
                maxLength={128}
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={async () => {
                                setUpdatingUserId(user.id);
                                try {
                                  const response = await authApi.adminResetPassword(user.id);
                                  if (!response.isSuccess)
                                    toast.error(
                                      response.errorMessage ?? "Could not send reset instructions",
                                    );
                                  else
                                    toast.success(
                                      `Password reset instructions queued for ${user.email}`,
                                    );
                                } finally {
                                  setUpdatingUserId(null);
                                }
                              }}
                            >
                              Send password reset
                            </DropdownMenuItem>
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
