import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_HOME, loginWithToken, useMounted, useSession } from "@/lib/session";
import { authApi } from "@/api/auth";
import buildSenseLogo from "@/assets/buildsense-logo.svg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in - BuildSense AI" },
      { name: "description", content: "Sign in to BuildSense AI." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const session = useSession();
  const mounted = useMounted();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (mounted && session) {
    return <Navigate to={ROLE_HOME[session.role]} />;
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const response = await authApi.login({ userEmail: email.trim(), password });
      if (!response.isSuccess || !response.result) {
        setError(response.errorMessage ?? "Invalid email or password");
        return;
      }
      const nextSession = loginWithToken(response.result);
      navigate({ to: ROLE_HOME[nextSession.role] });
    } catch {
      setError("Cannot reach the backend. Check that the API is running on localhost:5290.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <img src={buildSenseLogo} alt="BuildSense AI logo" className="h-10 w-10 rounded-lg object-cover" />
            <div>
              <CardTitle className="text-xl">BuildSense AI</CardTitle>
              <p className="text-sm text-muted-foreground">Backend account sign in</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => event.key === "Enter" && handleLogin()}
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                onKeyDown={(event) => event.key === "Enter" && handleLogin()}
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <Button className="w-full" onClick={handleLogin} disabled={loading || !email.trim() || !password.trim()}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</> : "Sign in"}
          </Button>
          <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-success" />
            Uses `POST /api/Auth/login` and stores the returned JWT for authenticated API calls.
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Need to verify an account?{" "}
            <Link to="/verify" className="text-primary hover:underline font-medium">Open verification</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
