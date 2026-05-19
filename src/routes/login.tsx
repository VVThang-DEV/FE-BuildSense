import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { HardHat, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEMO_USERS, ROLE_HOME, ROLE_LABELS, login, useSession, useMounted, type Role } from "@/lib/session";

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
  admin: "Define WBS, budgets, thresholds and the procurement workflow.",
  manager: "Approve POs, monitor KPIs and act on AI risk forecasts.",
  staff: "Manage users, alert rules and automated stakeholder reports.",
  engineer: "Log daily progress, attendance and material requests from site.",
  customer: "Watch your home being built with live photos and milestones.",
};

const ORDER: Role[] = ["admin", "manager", "staff", "engineer", "customer"];

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

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-background">
      {/* Hero */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <HardHat className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">BuildSense AI</p>
            <p className="text-xs opacity-70">Construction PM Platform</p>
          </div>
        </div>

        <div className="relative space-y-6 max-w-md">
          <Badge className="bg-sidebar-primary/20 text-sidebar-primary border-sidebar-primary/30">
            <Sparkles className="h-3 w-3" /> AI-Integrated
          </Badge>
          <h1 className="text-4xl font-semibold leading-tight">
            One platform for materials, progress and people on every site.
          </h1>
          <p className="text-sm opacity-80 leading-relaxed">
            BuildSense AI consolidates field updates, automates procurement, predicts schedule risk
            and keeps customers in the loop — from a single workspace tuned for residential
            construction in Vietnam and India.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              ["12", "Active projects"],
              ["148", "On-site staff"],
              ["98%", "On-time POs"],
              ["6.2 days", "Avg AI early-warning"],
            ].map(([v, k]) => (
              <div key={k} className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3">
                <p className="text-2xl font-semibold">{v}</p>
                <p className="text-xs opacity-70">{k}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs opacity-60 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          Demo prototype — no real authentication. Choose any role to explore.
        </p>
      </div>

      {/* Role select */}
      <div className="flex flex-col justify-center p-6 sm:p-12">
        <div className="lg:hidden mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HardHat className="h-4 w-4" />
          </div>
          <p className="font-semibold">BuildSense AI</p>
        </div>

        <div className="space-y-1 mb-6">
          <h2 className="text-2xl font-semibold">Sign in to your workspace</h2>
          <p className="text-sm text-muted-foreground">
            Pick a role to continue. Each role lands on its own home view.
          </p>
        </div>

        <div className="grid gap-3 max-w-xl">
          {ORDER.map((role) => {
            const u = DEMO_USERS[role];
            return (
              <Card
                key={role}
                onClick={() => signIn(role)}
                className="group cursor-pointer p-4 hover:border-primary hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {u.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{u.name}</p>
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        {ROLE_LABELS[role]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">{ROLE_TAGLINES[role]}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="opacity-60 group-hover:opacity-100">
                    Sign in <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-8 max-w-xl">
          By continuing you accept the demo terms. Session is stored locally in your browser only.
        </p>
      </div>
    </div>
  );
}
