import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Camera,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Plus,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { materialTree, siteTasks, type MaterialNode } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/site")({
  head: () => ({
    meta: [
      { title: "Site Engineer — BuildSense AI" },
      { name: "description", content: "On-site daily log, materials, and shortage reporting." },
    ],
  }),
  component: SitePage,
});

function MaterialBranch({ node, depth = 0 }: { node: MaterialNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = !!node.children?.length;

  if (!hasChildren) {
    return (
      <label
        className="flex items-center justify-between rounded-md border bg-background px-3 py-2.5 text-sm"
        style={{ marginLeft: depth * 12 }}
      >
        <div className="flex items-center gap-3">
          <Checkbox defaultChecked={node.received} />
          <span>{node.name}</span>
        </div>
        <span className="text-xs text-muted-foreground">{node.required}</span>
      </label>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-sm font-medium"
        style={{ marginLeft: depth * 12 }}
      >
        <ChevronRight
          className={cn("h-4 w-4 transition-transform", open && "rotate-90")}
        />
        {node.name}
      </button>
      {open && (
        <div className="space-y-1.5">
          {node.children!.map((c) => (
            <MaterialBranch key={c.name} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function SitePage() {
  const [tasks, setTasks] = useState(siteTasks);
  const [photos, setPhotos] = useState<string[]>([]);
  const [shortageOpen, setShortageOpen] = useState(false);

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 pb-24 pt-4">
      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Today · Oct 20, 2025</p>
              <h1 className="text-lg font-semibold">Project A — Villa 12</h1>
            </div>
            <Badge className="bg-warning text-warning-foreground">Structure</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Daily Progress Log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Daily Progress Log
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {tasks.map((t) => (
            <div key={t.id}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{t.name}</span>
                <span className="text-muted-foreground">{t.percent}%</span>
              </div>
              <Slider
                className="mt-3"
                value={[t.percent]}
                max={100}
                step={5}
                onValueChange={([v]) =>
                  setTasks((prev) =>
                    prev.map((x) => (x.id === t.id ? { ...x, percent: v } : x)),
                  )
                }
              />
            </div>
          ))}
          <Button
            className="w-full"
            onClick={() =>
              toast.success("Progress saved", { description: "Updates synced to PM dashboard." })
            }
          >
            <Save className="mr-2 h-4 w-4" /> Save progress
          </Button>
        </CardContent>
      </Card>

      {/* Media Upload */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Field Report Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <button
            onClick={() => {
              const sample = [
                "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&q=60",
                "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&q=60",
                "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=60",
              ];
              setPhotos((p) => [...p, sample[p.length % sample.length]]);
              toast.success("Photo uploaded");
            }}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/30 py-8 text-sm text-muted-foreground transition-colors hover:bg-muted/60"
          >
            <Camera className="h-6 w-6" />
            <span>Tap to upload field photos</span>
          </button>
          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <img key={i} src={p} alt="" className="aspect-square rounded-md object-cover" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Materials */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Today's Material Checklist</CardTitle>
          <p className="text-xs text-muted-foreground">Phase: Structure — east wall</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {materialTree.map((m) => (
            <MaterialBranch key={m.name} node={m} />
          ))}
        </CardContent>
      </Card>

      {/* Shortage */}
      <Sheet open={shortageOpen} onOpenChange={setShortageOpen}>
        <SheetTrigger asChild>
          <Button variant="destructive" className="w-full" size="lg">
            <CircleAlert className="mr-2 h-4 w-4" /> Report Material Shortage
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Report Shortage</SheetTitle>
          </SheetHeader>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setShortageOpen(false);
              toast.success("Shortage reported", {
                description: "PO request sent to Project Manager.",
              });
            }}
          >
            <div className="space-y-1.5">
              <Label>Material</Label>
              <Input defaultValue="Steel — Phi 10" />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity needed</Label>
              <Input type="number" defaultValue={120} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="e.g. needed before evening pour" />
            </div>
            <Button type="submit" className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Trigger PO Request
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </main>
  );
}
