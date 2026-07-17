import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Brain,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Package,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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

const HERO_FEATURES = [
  { icon: BarChart3, text: "Real-time plan vs. actual cost and schedule" },
  { icon: Brain, text: "AI anomaly detection and risk forecasts" },
  { icon: Package, text: "Automated material procurement workflows" },
  { icon: Users, text: "Field attendance and daily progress tracking" },
];

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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password.trim()) {
      setError("Enter a valid email address and password");
      return;
    }
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
    <div className="min-h-screen flex bg-background">
      <div
        className="relative hidden lg:flex w-[52%] shrink-0 flex-col justify-between overflow-hidden"
        style={{
          background:
            "linear-gradient(155deg, oklch(0.155 0.022 265) 0%, oklch(0.12 0.030 270) 60%, oklch(0.10 0.035 275) 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.92 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.92 0 0) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="absolute -top-32 -right-32 h-96 w-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "oklch(0.67 0.20 52)" }}
        />
        <div
          className="absolute bottom-0 left-0 h-64 w-64 rounded-full opacity-[0.06] blur-3xl"
          style={{ background: "oklch(0.57 0.23 285)" }}
        />

        <div className="relative z-10 flex items-center gap-3 p-10">
          <img
            src={buildSenseLogo}
            alt="BuildSense AI logo"
            className="h-11 w-11 rounded-xl object-cover"
          />
          <div>
            <p
              className="text-[15px] font-bold tracking-tight"
              style={{ color: "oklch(0.96 0.006 80)" }}
            >
              BuildSense AI
            </p>
            <p className="text-[11px] font-medium" style={{ color: "oklch(0.67 0.20 52)" }}>
              Construction PM Platform
            </p>
          </div>
          <Badge
            className="ml-auto border text-[10px] font-semibold"
            style={{
              background: "oklch(0.67 0.20 52 / 0.15)",
              borderColor: "oklch(0.67 0.20 52 / 0.35)",
              color: "oklch(0.67 0.20 52)",
            }}
          >
            <Sparkles className="mr-1 h-3 w-3" /> AI-Integrated
          </Badge>
        </div>

        <div className="relative z-10 space-y-6 px-10">
          <div>
            <p
              className="mb-3 text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: "oklch(0.67 0.20 52)" }}
            >
              SP26SE157 - Graduation Thesis
            </p>
            <h1
              className="text-[2.3rem] font-bold leading-[1.18] tracking-tight"
              style={{ color: "oklch(0.97 0.005 80)" }}
            >
              One platform for materials, progress and people on every site.
            </h1>
          </div>
          <p className="text-[13.5px] leading-relaxed" style={{ color: "oklch(0.68 0.018 265)" }}>
            BuildSense AI consolidates field updates, automates procurement, predicts schedule risk
            and keeps customers in the loop, built for residential construction in Vietnam.
          </p>
          <div className="space-y-2.5">
            {HERO_FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "oklch(0.67 0.20 52 / 0.12)" }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: "oklch(0.67 0.20 52)" }} />
                </div>
                <span className="text-[13px]" style={{ color: "oklch(0.76 0.016 265)" }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 p-10">
          <p
            className="flex items-center gap-2 text-[11px]"
            style={{ color: "oklch(0.44 0.018 265)" }}
          >
            <Building2 className="h-3.5 w-3.5" />
            FPT University - Software Engineering - SU2026
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center overflow-y-auto px-6 py-10 sm:px-12 xl:px-16">
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <img
            src={buildSenseLogo}
            alt="BuildSense AI logo"
            className="h-9 w-9 rounded-xl object-cover"
          />
          <div>
            <p className="text-sm font-bold">BuildSense AI</p>
            <p className="text-[10px] text-muted-foreground">SP26SE157</p>
          </div>
        </div>

        <div className="max-w-md">
          <div className="mb-6">
            <h2 className="text-[1.65rem] font-bold tracking-tight text-foreground">Sign in</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to your BuildSense AI workspace.
            </p>
          </div>

          <div className="space-y-3">
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
                placeholder="you@buildsense.ai"
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
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
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
            <Button
              className="h-10 w-full"
              onClick={handleLogin}
              disabled={loading || !email.trim() || !password.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
            <p className="pt-1 text-center text-xs text-muted-foreground">
              Just registered?{" "}
              <Link to="/verify" className="font-medium text-primary hover:underline">
                Verify your email
              </Link>
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <Separator />
            <div className="flex items-start gap-2 text-[11.5px] text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
              <span>
                Uses the backend Auth login endpoint and stores the returned JWT for authenticated
                API calls.
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground/55">
              <CheckCircle2 className="h-3 w-3 text-success/60" />
              BuildSense AI - SP26SE157 - FPT University SU2026
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
