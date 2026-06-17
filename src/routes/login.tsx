import { createFileRoute, Navigate, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  HardHat, ShieldCheck, ArrowRight, Sparkles, BarChart3,
  Users, Package, Brain, CheckCircle2, Building2,
  Eye, EyeOff, AlertCircle, ChevronDown, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { DEMO_USERS, ROLE_HOME, ROLE_LABELS, login, loginWithToken, useSession, useMounted, type Role } from "@/lib/session";
import { authApi } from "@/api/auth";
import buildSenseLogo from "@/assets/buildsense-logo.svg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — BuildSense AI" },
      { name: "description", content: "Choose your role to enter the demo." },
    ],
  }),
  component: LoginPage,
});

const ROLE_TAGLINES: Record<Role, string> = {
  admin: "Define WBS, budgets, alert thresholds and the procurement workflow.",
  manager: "Approve POs, monitor KPIs and act on AI risk forecasts.",
  staff: "Manage users, notification rules and automated stakeholder reports.",
  engineer: "Log daily progress, attendance and material requests from site.",
  customer: "Watch your home being built with live photos and milestones.",
};

const ROLE_COLORS: Record<Role, { bg: string; text: string; border: string; dot: string }> = {
  admin:    { bg: "bg-destructive/10",  text: "text-destructive",        border: "border-destructive/25",  dot: "bg-destructive" },
  manager:  { bg: "bg-primary/10",      text: "text-primary",            border: "border-primary/25",      dot: "bg-primary" },
  staff:    { bg: "bg-success/10",      text: "text-success",            border: "border-success/25",      dot: "bg-success" },
  engineer: { bg: "bg-warning/20",      text: "text-warning-foreground", border: "border-warning/35",      dot: "bg-warning" },
  customer: { bg: "bg-ai/10",           text: "text-ai",                 border: "border-ai/25",           dot: "bg-ai" },
};

const ORDER: Role[] = ["admin", "manager", "staff", "engineer", "customer"];

const HERO_STATS = [
  { value: "12",    label: "Active Projects" },
  { value: "148",   label: "On-site Workers" },
  { value: "98%",   label: "On-time POs" },
  { value: "6.2d",  label: "AI Early Warning" },
];

const HERO_FEATURES = [
  { icon: BarChart3, text: "Real-time plan vs. actual cost & schedule" },
  { icon: Brain,     text: "AI anomaly detection & risk forecasts" },
  { icon: Package,   text: "Automated material procurement workflows" },
  { icon: Users,     text: "Field attendance & daily progress tracking" },
];

function LoginPage() {
  const session = useSession();
  const mounted = useMounted();
  const navigate = useNavigate();

  if (mounted && session) {
    return <Navigate to={ROLE_HOME[session.role]} />;
  }

  const signIn = (role: Role) => {
    login(role);
    navigate({ to: ROLE_HOME[role] });
  };

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [demoOpen, setDemoOpen] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await authApi.login({ userEmail: email, password });
      if (!res.isSuccess || !res.result) {
        setError(res.errorMessage ?? "Invalid email or password");
        return;
      }
      const s = loginWithToken(res.result);
      navigate({ to: ROLE_HOME[s.role] });
    } catch {
      setError("Cannot reach server — is the backend running on localhost:5290?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left Hero Panel ── */}
      <div
        className="relative hidden lg:flex w-[52%] shrink-0 flex-col justify-between overflow-hidden"
        style={{ background: "linear-gradient(155deg, oklch(0.155 0.022 265) 0%, oklch(0.12 0.030 270) 60%, oklch(0.10 0.035 275) 100%)" }}
      >
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(oklch(0.92 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.92 0 0) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "oklch(0.67 0.20 52)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-[0.06] blur-3xl" style={{ background: "oklch(0.57 0.23 285)" }} />

        {/* Logo bar */}
        <div className="relative z-10 flex items-center gap-3 p-10">
          <img src={buildSenseLogo} alt="BuildSense AI logo" className="h-11 w-11 rounded-xl object-cover" />
          <div>
            <p className="text-[15px] font-bold tracking-tight" style={{ color: "oklch(0.96 0.006 80)" }}>BuildSense AI</p>
            <p className="text-[11px] font-medium" style={{ color: "oklch(0.67 0.20 52)" }}>Construction PM Platform</p>
          </div>
          <Badge
            className="ml-auto text-[10px] font-semibold border"
            style={{ background: "oklch(0.67 0.20 52 / 0.15)", borderColor: "oklch(0.67 0.20 52 / 0.35)", color: "oklch(0.67 0.20 52)" }}
          >
            <Sparkles className="h-3 w-3 mr-1" /> AI-Integrated
          </Badge>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 px-10 space-y-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "oklch(0.67 0.20 52)" }}>
              SP26SE157 · Graduation Thesis
            </p>
            <h1 className="text-[2.3rem] font-bold leading-[1.18] tracking-tight" style={{ color: "oklch(0.97 0.005 80)" }}>
              One platform for materials, progress &amp; people on every site.
            </h1>
          </div>
          <p className="text-[13.5px] leading-relaxed" style={{ color: "oklch(0.68 0.018 265)" }}>
            BuildSense AI consolidates field updates, automates procurement,
            predicts schedule risk and keeps customers in the loop — built
            for residential construction in Vietnam.
          </p>
          <div className="space-y-2.5">
            {HERO_FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: "oklch(0.67 0.20 52 / 0.12)" }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: "oklch(0.67 0.20 52)" }} />
                </div>
                <span className="text-[13px]" style={{ color: "oklch(0.76 0.016 265)" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats card */}
        <div className="relative z-10 p-10">
          <div className="rounded-2xl p-5" style={{ background: "oklch(0.22 0.022 265 / 0.55)", border: "1px solid oklch(0.30 0.020 265 / 0.50)" }}>
            <div className="grid grid-cols-4 gap-4">
              {HERO_STATS.map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-[1.6rem] font-bold" style={{ color: "oklch(0.67 0.20 52)" }}>{value}</p>
                  <p className="text-[10.5px] mt-0.5" style={{ color: "oklch(0.58 0.018 265)" }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-5 text-[11px] flex items-center gap-2" style={{ color: "oklch(0.44 0.018 265)" }}>
            <Building2 className="h-3.5 w-3.5" />
            FPT University · Software Engineering · SU2026
          </p>
        </div>
      </div>

      {/* ── Right Login Panel ── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-12 xl:px-16 overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden mb-8 flex items-center gap-3">
          <img src={buildSenseLogo} alt="BuildSense AI logo" className="h-9 w-9 rounded-xl object-cover" />
          <div>
            <p className="font-bold text-sm">BuildSense AI</p>
            <p className="text-[10px] text-muted-foreground">SP26SE157</p>
          </div>
        </div>

        {/* ── Real login form ── */}
        <div className="max-w-md mb-6">
          <div className="mb-6">
            <h2 className="text-[1.65rem] font-bold tracking-tight text-foreground">Sign in</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your BuildSense AI workspace.</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input id="login-email" type="email" placeholder="you@buildsense.ai"
                value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-pwd">Password</Label>
              <div className="relative">
                <Input id="login-pwd" type={showPwd ? "text" : "password"} placeholder="••••••••"
                  value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()} className="pr-10" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-[12px] text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
              </div>
            )}
            <Button className="w-full h-10" onClick={handleLogin}
              disabled={loading || !email.trim() || !password.trim()}>
              {loading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…</>
                : "Sign in"}
            </Button>
            <p className="text-center text-xs text-muted-foreground pt-1">
              Just registered?{" "}
              <Link to="/verify" className="text-primary hover:underline font-medium">
                Verify your email →
              </Link>
            </p>
          </div>
        </div>

        {/* ── Demo / thesis preview ── */}
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-border" />
            <button type="button" onClick={() => setDemoOpen(!demoOpen)}
              className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-ai" />
              Thesis demo — quick role switch
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", demoOpen && "rotate-180")} />
            </button>
            <div className="flex-1 h-px bg-border" />
          </div>
          {demoOpen && (
            <div className="space-y-1.5">
              {ORDER.map((role) => {
                const u = DEMO_USERS[role];
                const c = ROLE_COLORS[role];
                return (
                  <button key={role} onClick={() => signIn(role)}
                    className="group w-full text-left rounded-xl border bg-card px-3.5 py-2.5 transition-all hover:shadow-sm hover:-translate-y-px cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${c.bg} ${c.text}`}>{u.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[13px] text-foreground">{u.name}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                            {ROLE_LABELS[role]}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground/70 truncate">{ROLE_TAGLINES[role]}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 max-w-md space-y-2">
          <Separator />
          <div className="flex items-start gap-2 text-[11.5px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-success" />
            <span>
              Backend at <code className="text-[10px] bg-muted px-1 py-0.5 rounded">localhost:5290</code>.
              Demo mode works offline with mock data — no backend required.
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/55">
            <CheckCircle2 className="h-3 w-3 text-success/60" />
            BuildSense AI · SP26SE157 · FPT University SU2026
          </div>
        </div>
      </div>
    </div>
  );
}
