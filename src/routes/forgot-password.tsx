import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password - BuildSense AI" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState({ userId: "", token: "", password: "", confirm: "" });

  const requestReset = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Enter a valid email address");
      return;
    }
    setBusy(true);
    try {
      const response = await authApi.forgotPassword(email.trim());
      if (!response.isSuccess) toast.error(response.errorMessage ?? "Could not request reset");
      else {
        setRequested(true);
        toast.success("If the account is eligible, reset instructions have been sent");
      }
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async () => {
    const userId = Number(reset.userId);
    if (!Number.isInteger(userId) || userId <= 0 || !/^\d{6}$/.test(reset.token)) {
      toast.error("Enter the user ID and six-digit code from the email");
      return;
    }
    if (
      reset.password !== reset.confirm ||
      reset.password.length < 10 ||
      !/[a-z]/.test(reset.password) ||
      !/[A-Z]/.test(reset.password) ||
      !/\d/.test(reset.password)
    ) {
      toast.error(
        "Passwords must match and contain 10+ characters, uppercase, lowercase, and a number",
      );
      return;
    }
    setBusy(true);
    try {
      const response = await authApi.resetPassword({
        userId,
        token: reset.token,
        newPassword: reset.password,
        confirmPassword: reset.confirm,
      });
      if (!response.isSuccess) toast.error(response.errorMessage ?? "Password reset failed");
      else {
        toast.success("Password changed. Sign in with the new password");
        navigate({ to: "/login" });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <p className="text-sm text-muted-foreground">
            Request a code, then enter the user ID and code from your email.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="reset-email">Email</Label>
            <div className="flex gap-2">
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Button variant="outline" disabled={busy} onClick={requestReset}>
                Send code
              </Button>
            </div>
          </div>
          {requested && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>User ID</Label>
                  <Input
                    value={reset.userId}
                    onChange={(event) =>
                      setReset((current) => ({ ...current, userId: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Six-digit code</Label>
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={reset.token}
                    onChange={(event) =>
                      setReset((current) => ({ ...current, token: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label>New password</Label>
                <Input
                  type="password"
                  value={reset.password}
                  onChange={(event) =>
                    setReset((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Confirm password</Label>
                <Input
                  type="password"
                  value={reset.confirm}
                  onChange={(event) =>
                    setReset((current) => ({ ...current, confirm: event.target.value }))
                  }
                />
              </div>
              <Button className="w-full" disabled={busy} onClick={submitReset}>
                Reset password
              </Button>
            </>
          )}
          <Button asChild variant="ghost" className="w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
