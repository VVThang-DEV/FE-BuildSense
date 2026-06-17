import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { User, Mail, Phone, Save, Loader2, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { useSession } from "@/lib/session";
import { usersApi, BACKEND_ROLE_LABEL } from "@/api/users";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "My Profile — BuildSense AI" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const session = useSession();
  const isLive = !!session?.token;

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => { const r = await usersApi.getProfile(); return r.result; },
    enabled: isLive,
    staleTime: 60_000,
  });

  const [form, setForm] = useState({ firstName: "", lastName: "", phoneNumber: "" });
  const [formInit, setFormInit] = useState(false);
  const [saving, setSaving] = useState(false);

  // initialise form once profile loads
  if (profile && !formInit) {
    setForm({
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      phoneNumber: profile.phoneNumber ?? "",
    });
    setFormInit(true);
  }

  const save = async () => {
    setSaving(true);
    try {
      const r = await usersApi.updateProfile(form);
      if (r.isSuccess) { toast.success("Profile updated"); refetch(); }
      else toast.error(r.errorMessage ?? "Update failed");
    } catch {
      toast.error("Update failed — check your connection");
    } finally {
      setSaving(false);
    }
  };

  const initials = (form.firstName?.[0] ?? session?.name?.[0] ?? "U").toUpperCase();
  const displayName = profile
    ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || session?.name
    : session?.name;
  const roleLabel = profile
    ? (BACKEND_ROLE_LABEL[profile.role] ?? String(profile.role))
    : (session?.role ?? "");

  return (
    <div className="max-w-[900px] mx-auto">
      <PageHeader
        section="Account"
        title="My Profile"
        description="View and update your account information."
      />

      <div className="grid md:grid-cols-[280px_1fr] gap-4">
        {/* Identity card */}
        <Card className="shadow-sm h-fit">
          <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary border-2 border-primary/20">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-base leading-tight">{displayName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{profile?.email ?? session?.email ?? "—"}</p>
            </div>
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 gap-1">
              <Shield className="h-3 w-3" /> {roleLabel}
            </Badge>
            <Separator />
            <div className="w-full text-left space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{profile?.email ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>{profile?.phoneNumber || "Not set"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span>ID: {profile?.id ?? session?.userId ?? "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit form */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold">Edit Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!isLive ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Sign in with a real account to edit your profile.
              </div>
            ) : isLoading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading profile…</div>
            ) : (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                      placeholder="Nguyen"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                      placeholder="Van A"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    value={form.phoneNumber}
                    onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                    placeholder="+84 98 765 4321"
                  />
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label>Email address <span className="text-muted-foreground text-xs">(cannot change)</span></Label>
                  <Input value={profile?.email ?? ""} disabled className="bg-muted/40" />
                </div>
                <div className="space-y-1.5">
                  <Label>Role <span className="text-muted-foreground text-xs">(managed by admin)</span></Label>
                  <Input value={roleLabel} disabled className="bg-muted/40" />
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={save} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save changes
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
