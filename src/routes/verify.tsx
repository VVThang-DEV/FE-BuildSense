import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/api/auth";
import buildSenseLogo from "@/assets/buildsense-logo.svg";

export const Route = createFileRoute("/verify")({
  head: () => ({ meta: [{ title: "Verify Email — BuildSense AI" }] }),
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!userId.trim() || !code.trim()) {
      toast.error("Both fields are required");
      return;
    }
    setLoading(true);
    try {
      const r = await authApi.verify(Number(userId), code.trim());
      if (r.isSuccess) {
        setDone(true);
        toast.success("Email verified — you can now sign in.");
        setTimeout(() => navigate({ to: "/login" }), 2000);
      } else {
        toast.error(r.errorMessage ?? "Invalid or expired code");
      }
    } catch {
      toast.error("Verification failed — check your connection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-card shadow-lg p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-2 mb-1">
              <img
                src={buildSenseLogo}
                alt="BuildSense AI"
                className="h-8 w-8 rounded-lg object-cover"
              />
              <span className="text-sm font-bold">BuildSense AI</span>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Verify your email</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the verification code sent to your email address.
              </p>
            </div>
          </div>

          {done ? (
            <div className="rounded-xl bg-success/10 border border-success/25 p-4 text-center">
              <p className="text-sm font-semibold text-success">
                ✅ Verified! Redirecting to sign in…
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g. 42"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Your User ID was returned when you registered — check the API response or your
                  email.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. 482910"
                  maxLength={10}
                  disabled={loading}
                  className="tracking-widest text-center text-lg font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={loading || !userId.trim() || !code.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying…
                  </>
                ) : (
                  "Verify Email"
                )}
              </Button>
            </div>
          )}

          <div className="text-center">
            <Link
              to="/login"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back to sign in
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          SP26SE157 · FPT University · SU2026
        </p>
      </div>
    </div>
  );
}
