import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Circle, Loader2, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  customerProject,
  customerUpdates,
  galleryPhotos,
  milestones,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer")({
  head: () => ({
    meta: [
      { title: "Your Home — BuildSense AI" },
      { name: "description", content: "Track milestones and daily progress of your home." },
    ],
  }),
  component: CustomerPortal,
});

function CustomerPortal() {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const pct = customerProject.percent;
  const circumference = 2 * Math.PI * 44;

  return (
    <main className="mx-auto max-w-[1100px] space-y-6 px-4 py-6">
      {/* Hero */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {customerProject.community}
              </p>
              <h1 className="mt-1 text-2xl font-semibold">{customerProject.house}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Expected handover · <span className="font-medium text-foreground">{customerProject.handover}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your project manager · <span className="font-medium text-foreground">{customerProject.pm}</span>
              </p>
            </div>
            <div className="relative h-28 w-28">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="44" fill="none" stroke="var(--muted)" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="var(--success)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (circumference * pct) / 100}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold">{pct}%</span>
                <span className="text-[10px] uppercase text-muted-foreground">Complete</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Milestones */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Project Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative ml-3 space-y-5 border-l-2 border-muted pl-6">
              {milestones.map((m) => {
                const done = m.status === "done";
                const current = m.status === "current";
                return (
                  <li key={m.name} className="relative">
                    <span
                      className={cn(
                        "absolute -left-[34px] flex h-7 w-7 items-center justify-center rounded-full border-2",
                        done && "border-success bg-success text-success-foreground",
                        current && "border-ai bg-background text-ai",
                        !done && !current && "border-muted bg-background text-muted-foreground",
                      )}
                    >
                      {done ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : current ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Circle className="h-2 w-2 fill-current" />
                      )}
                    </span>
                    <div>
                      <p className={cn("text-sm font-medium", current && "text-ai")}>
                        {m.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{m.date}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        {/* Updates */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" /> Project Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customerUpdates.map((u) => (
              <div key={u.date} className="flex gap-3 rounded-md border bg-muted/20 p-3">
                <Badge variant="outline" className="shrink-0">{u.date}</Badge>
                <p className="text-sm">{u.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Photo Gallery */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Site Photo Gallery</CardTitle>
          <p className="text-xs text-muted-foreground">Uploaded daily by your site engineer</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {galleryPhotos.map((p) => (
              <button
                key={p.url}
                onClick={() => setLightbox(p.url)}
                className="group relative overflow-hidden rounded-lg"
              >
                <img
                  src={p.url}
                  alt={`Site progress ${p.date}`}
                  className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-xs font-medium text-white">{p.date}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl p-0">
          <DialogTitle className="sr-only">Site photo</DialogTitle>
          {lightbox && <img src={lightbox} alt="" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </main>
  );
}
