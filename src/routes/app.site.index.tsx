import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Camera, Send, Clock, AlertCircle, PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { siteTasks } from "@/lib/mock-data";
import { PageHeader } from "@/components/page-header";
import { MockDataBanner } from "@/components/mock-banner";

export const Route = createFileRoute("/app/site/")({
  head: () => ({ meta: [{ title: "Today on Site — BuildSense AI" }] }),
  component: SitePage,
});

function SitePage() {
  const [tasks, setTasks] = useState(siteTasks.map((t) => ({ ...t })));
  const [checkedIn, setCheckedIn] = useState(true);
  const [matOpen, setMatOpen] = useState(false);
  const [matName, setMatName] = useState("");
  const [matQty, setMatQty] = useState("");
  const [matUnit, setMatUnit] = useState("kg");
  const [matDate, setMatDate] = useState("");
  const [matReason, setMatReason] = useState("");

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <PageHeader section="Field" title="Today on Site" description="Track attendance, submit progress and request materials." />
      <div className="space-y-4">
      <MockDataBanner message="Demo data — tasks, attendance and material requests are sample data. Submissions are simulated." />
      {/* Attendance */}
      <Card className="border-primary/25 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Villa 12 · Plot 7
            </div>
            <p className="font-medium mt-0.5">
              {checkedIn ? "Checked in at 08:02" : "Not checked in"}
            </p>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs"
            variant={checkedIn ? "outline" : "default"}
            onClick={() => { setCheckedIn(!checkedIn); toast.success(checkedIn ? "Checked out" : "Checked in"); }}
          >
            <Clock className="h-3.5 w-3.5 mr-1" />
            {checkedIn ? "Check out" : "Check in"}
          </Button>
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 border-b"><CardTitle className="text-[14px] font-semibold">Today's tasks</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-4">
          {tasks.map((t, i) => (
            <div key={t.id} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t.name}</span>
                <span className="font-medium tabular-nums">{t.percent}%</span>
              </div>
              <Slider
                value={[t.percent]}
                max={100}
                step={5}
                onValueChange={(v) => setTasks((prev) => prev.map((x, idx) => idx === i ? { ...x, percent: v[0] } : x))}
              />
            </div>
          ))}
          <Button className="w-full h-9 text-sm" onClick={() => toast.success("Progress submitted to PM")}>
            <Send className="h-4 w-4 mr-1" /> Submit today's progress
          </Button>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Sheet open={matOpen} onOpenChange={setMatOpen}>
          <SheetTrigger asChild>
            <Card className="cursor-pointer hover:border-primary transition">
              <CardContent className="p-4 flex flex-col items-start gap-2">
                <PackageSearch className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium">Request material</p>
                <p className="text-xs text-muted-foreground">Open shortage PO</p>
              </CardContent>
            </Card>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader><SheetTitle>Request material</SheetTitle></SheetHeader>
            <div className="space-y-3 mt-4 px-1">
              <div><Label>Material</Label><Input value={matName} onChange={(e) => setMatName(e.target.value)} placeholder="e.g. Phi 10 Steel" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantity</Label><Input type="number" value={matQty} onChange={(e) => setMatQty(e.target.value)} placeholder="200" /></div>
                <div><Label>Unit</Label><Input value={matUnit} onChange={(e) => setMatUnit(e.target.value)} placeholder="kg" /></div>
              </div>
              <div><Label>Needed by</Label><Input type="date" value={matDate} onChange={(e) => setMatDate(e.target.value)} /></div>
              <div><Label>Reason</Label><Textarea value={matReason} onChange={(e) => setMatReason(e.target.value)} placeholder="Slab pour next Tuesday" /></div>
              <Button className="w-full" onClick={() => {
                if (!matName.trim()) { toast.error("Enter material name"); return; }
                toast.success(`Shortage request for ${matName} sent to PM`);
                setMatOpen(false);
                setMatName(""); setMatQty(""); setMatUnit("kg"); setMatDate(""); setMatReason("");
              }}>Send request</Button>
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/app/site/report">
          <Card className="cursor-pointer hover:border-primary transition">
            <CardContent className="p-4 flex flex-col items-start gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium">Daily report</p>
              <p className="text-xs text-muted-foreground">With photos</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* AI alert */}
      <Card className="bg-ai/5 border-ai/30">
        <CardContent className="p-4 flex gap-3">
          <AlertCircle className="h-4 w-4 text-ai mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Heads up: Phi 10 steel low</p>
            <p className="text-xs text-muted-foreground mt-1">Current stock 90 kg vs. reorder 200 kg. PM has been notified.</p>
            <Badge variant="outline" className="mt-2 text-[10px] bg-ai/10 text-ai border-ai/30">AI insight</Badge>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
