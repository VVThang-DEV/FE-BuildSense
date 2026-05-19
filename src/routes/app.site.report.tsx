import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, Send } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { dailyReports } from "@/lib/mock-data";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/site/report")({
  head: () => ({ meta: [{ title: "Daily Report — BuildSense AI" }] }),
  component: ReportPage,
});

const WEATHER_OPTIONS = [
  { id: "sunny",        label: "Sunny",         emoji: "☀️",  tempHint: "28–36°C", bg: "bg-amber-50 dark:bg-amber-900/20",    border: "border-amber-400",      text: "text-amber-700 dark:text-amber-300" },
  { id: "partly-cloud", label: "Partly Cloudy", emoji: "⛅",  tempHint: "24–30°C", bg: "bg-sky-50 dark:bg-sky-900/20",        border: "border-sky-300",        text: "text-sky-700 dark:text-sky-300" },
  { id: "overcast",     label: "Overcast",      emoji: "☁️",  tempHint: "20–26°C", bg: "bg-slate-50 dark:bg-slate-800/40",    border: "border-slate-400",      text: "text-slate-600 dark:text-slate-300" },
  { id: "light-rain",   label: "Light Rain",    emoji: "🌦️", tempHint: "20–25°C", bg: "bg-blue-50 dark:bg-blue-900/20",      border: "border-blue-400",       text: "text-blue-700 dark:text-blue-300" },
  { id: "heavy-rain",   label: "Heavy Rain",    emoji: "⛈️", tempHint: "18–22°C", bg: "bg-indigo-50 dark:bg-indigo-900/20",  border: "border-indigo-500",     text: "text-indigo-700 dark:text-indigo-300" },
  { id: "extreme-heat", label: "Extreme Heat",  emoji: "🌡️", tempHint: "38–45°C", bg: "bg-orange-50 dark:bg-orange-900/20",  border: "border-orange-500",     text: "text-orange-700 dark:text-orange-300" },
] as const;

type WeatherId = typeof WEATHER_OPTIONS[number]["id"];

const WEATHER_REPORT_EMOJI: Record<string, string> = {
  sunny: "☀️", "partly-cloud": "⛅", overcast: "☁️",
  "light-rain": "🌦️", "heavy-rain": "⛈️", "extreme-heat": "🌡️",
};

function ReportPage() {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [weather, setWeather] = useState<WeatherId>("sunny");
  const [temp, setTemp] = useState("32");
  const [headcount, setHeadcount] = useState("24");
  const [work, setWork] = useState("");
  const [blockers, setBlockers] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const selectedWeather = WEATHER_OPTIONS.find((w) => w.id === weather)!;

  const handleSubmit = () => {
    if (!work.trim()) { toast.error("Please describe work completed today"); return; }
    setWork(""); setBlockers(""); setHeadcount("24");
    setSubmitted(true);
    toast.success("Daily report submitted to PM");
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <PageHeader
        section="Field"
        title="Daily Site Report"
        description="Submitted to PM · Visible in customer feed (filtered)."
      />

      <div className="space-y-5">
        {submitted && (
          <div className="rounded-xl border border-success/30 bg-success/8 p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-success/15 flex items-center justify-center text-success text-lg">✓</div>
            <div>
              <p className="text-[13px] font-semibold text-success">Report submitted successfully</p>
              <p className="text-[11px] text-muted-foreground">PM notified · Customer feed updated (filtered)</p>
            </div>
          </div>
        )}

        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[14px] font-semibold">New Report</CardTitle>
              <Badge variant="outline" className="text-[10px] bg-primary/8 text-primary border-primary/25">Today · {date}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-5">

            {/* Date + headcount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Headcount on site</Label>
                <Input type="number" value={headcount} onChange={(e) => setHeadcount(e.target.value)} min={0} />
              </div>
            </div>

            {/* Visual weather picker */}
            <div className="space-y-2">
              <Label className="text-xs">Weather conditions</Label>
              <div className="grid grid-cols-3 gap-2">
                {WEATHER_OPTIONS.map((w) => {
                  const active = weather === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setWeather(w.id)}
                      className={cn(
                        "rounded-xl border-2 p-3 flex flex-col items-center gap-1 text-center transition-all",
                        active ? `${w.bg} ${w.border}` : "border-border hover:border-border/80 hover:bg-muted/40",
                      )}
                    >
                      <span className="text-2xl leading-none">{w.emoji}</span>
                      <span className={cn("text-[11px] font-medium mt-0.5", active ? w.text : "text-muted-foreground")}>{w.label}</span>
                      <span className={cn("text-[10px]", active ? w.text + " opacity-70" : "text-muted-foreground/60")}>{w.tempHint}</span>
                    </button>
                  );
                })}
              </div>
              {/* Selected weather summary */}
              <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2 border", selectedWeather.bg, selectedWeather.border, "border-opacity-60")}>
                <span className="text-lg">{selectedWeather.emoji}</span>
                <div className="flex-1">
                  <span className={cn("text-[12px] font-medium", selectedWeather.text)}>{selectedWeather.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    className="h-7 w-16 text-xs text-center"
                    placeholder="32"
                  />
                  <span className={cn("text-[12px]", selectedWeather.text)}>°C</span>
                </div>
              </div>
            </div>

            {/* Work done */}
            <div className="space-y-1.5">
              <Label className="text-xs">Work completed today <span className="text-destructive">*</span></Label>
              <Textarea
                rows={3}
                value={work}
                onChange={(e) => setWork(e.target.value)}
                placeholder="Brickwork L2 east — 1.4m raised. Plastering bedroom 2 complete…"
              />
            </div>

            {/* Blockers */}
            <div className="space-y-1.5">
              <Label className="text-xs">Blockers / risks</Label>
              <Textarea
                rows={2}
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="Awaiting Phi 10 steel delivery…"
              />
            </div>

            {/* Photo upload */}
            <div className="space-y-1.5">
              <Label className="text-xs">Photos</Label>
              <div
                className="border-2 border-dashed rounded-xl p-6 text-center text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onClick={() => toast.info("Camera / gallery picker (demo)")}
              >
                <Upload className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-[12px]">Tap to add photos from camera / gallery</p>
                <p className="text-[11px] opacity-60 mt-0.5">JPEG, PNG · Max 10 MB each</p>
              </div>
            </div>

            <Button className="w-full h-9" onClick={handleSubmit}>
              <Send className="h-4 w-4 mr-1.5" /> Submit daily report
            </Button>
          </CardContent>
        </Card>

        {/* Past reports */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 border-b"><CardTitle className="text-[14px] font-semibold">Past Reports</CardTitle></CardHeader>
          <CardContent className="divide-y p-0">
            {dailyReports.map((r) => {
              const wid = r.weather.toLowerCase().includes("sunny") ? "sunny"
                : r.weather.toLowerCase().includes("partly") ? "partly-cloud"
                : r.weather.toLowerCase().includes("rain") ? "light-rain"
                : "overcast";
              return (
                <div key={r.date} className="px-4 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[13px] font-semibold">{r.date}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[13px]">{WEATHER_REPORT_EMOJI[wid]}</span>
                      <span className="text-[11px] text-muted-foreground">{r.weather} · {r.headcount} workers</span>
                    </div>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-1 leading-snug">{r.work}</p>
                  {r.blockers !== "—" && (
                    <div className="mt-2 flex items-start gap-1.5">
                      <Badge variant="outline" className="text-[10px] bg-destructive/8 text-destructive border-destructive/25 shrink-0">Blocker</Badge>
                      <p className="text-[12px] text-destructive/80 leading-snug">{r.blockers}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
