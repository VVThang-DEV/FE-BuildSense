import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Circle, Clock, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { customerProject, customerUpdates, galleryPhotos, milestones } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/portal")({
  head: () => ({ meta: [{ title: "My House — BuildSense AI" }] }),
  component: PortalPage,
});

function PortalPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const radius = 38;
  const c = 2 * Math.PI * radius;
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hero */}
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-[1fr_auto] gap-4 p-6 items-center">
          <div>
            <Badge variant="secondary">{customerProject.community}</Badge>
            <h1 className="text-2xl font-semibold mt-2">{customerProject.house}</h1>
            <p className="text-sm text-muted-foreground mt-1">PM · {customerProject.pm} · Handover {customerProject.handover}</p>
          </div>
          <div className="flex items-center gap-4">
            <svg width={100} height={100} viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={radius} stroke="hsl(var(--muted))" strokeWidth={8} fill="none" />
              <circle cx={50} cy={50} r={radius} stroke="oklch(0.65 0.16 150)" strokeWidth={8} fill="none"
                strokeDasharray={`${(customerProject.percent / 100) * c} ${c}`} strokeLinecap="round"
                transform="rotate(-90 50 50)" />
              <text x={50} y={56} textAnchor="middle" fontSize={20} fontWeight={600} fill="currentColor">{customerProject.percent}%</text>
            </svg>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Milestones */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Milestones</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {milestones.map((m) => {
              const Icon = m.status === "done" ? CheckCircle2 : m.status === "current" ? Clock : Circle;
              return (
                <div key={m.name} className="flex items-center gap-3">
                  <Icon className={cn("h-5 w-5",
                    m.status === "done" ? "text-success" : m.status === "current" ? "text-warning" : "text-muted-foreground")} />
                  <div className="flex-1">
                    <p className={cn("text-sm", m.status === "current" && "font-medium")}>{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.date}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Updates feed */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Latest updates</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {customerUpdates.map((u) => (
              <div key={u.date} className="text-sm">
                <p className="text-xs text-muted-foreground">{u.date}</p>
                <p>{u.text}</p>
              </div>
            ))}
            <div className="mt-3 rounded-md bg-ai/5 border border-ai/30 p-3 text-xs">
              <p className="flex items-center gap-1 text-ai font-medium"><Sparkles className="h-3 w-3" /> AI heads-up</p>
              <p className="mt-1">Forecast handover is on track for {customerProject.handover}.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Photos */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Photo updates</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {galleryPhotos.map((p) => (
              <Dialog key={p.url} open={selected === p.url} onOpenChange={(o) => setSelected(o ? p.url : null)}>
                <DialogTrigger asChild>
                  <button className="rounded-lg overflow-hidden border hover:border-primary transition">
                    <img src={p.url} alt={p.date} className="aspect-[4/3] w-full object-cover" />
                    <p className="text-xs p-2 text-left text-muted-foreground">{p.date}</p>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl"><img src={p.url} alt={p.date} className="w-full rounded-lg" /></DialogContent>
              </Dialog>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
