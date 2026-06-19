import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send, Sparkles, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { aiChatSeed } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { MockDataBanner } from "@/components/mock-banner";

export const Route = createFileRoute("/app/ai")({
  head: () => ({ meta: [{ title: "AI Agent — BuildSense AI" }] }),
  component: AiAgent,
});

const SUGGESTIONS = [
  "Which projects are at risk of slipping this month?",
  "Show cement consumption anomalies for Project D",
  "Draft daily briefing for Manager group",
  "Forecast PO volume for next 14 days",
];

function AiAgent() {
  const [messages, setMessages] = useState(aiChatSeed);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [
      ...m,
      { role: "user", text },
      { role: "ai", text: "Analysing project data… I'd cross-reference baseline vs. actual, weather forecast and supplier lead times. (Demo response — backend not connected.)" },
    ]);
    setInput("");
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4 max-w-[1400px] mx-auto h-[calc(100vh-12rem)]">
      <Card className="flex flex-col shadow-sm">
        <CardHeader className="pb-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[14px] font-semibold flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ai/10">
                <Sparkles className="h-3.5 w-3.5 text-ai" />
              </div>
              AI Agent
            </CardTitle>
            <Badge variant="outline" className="bg-warning/15 text-warning-foreground border-warning/30 text-[10px]">● Demo Mode</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          <MockDataBanner message="Demo AI — responses are pre-scripted. No backend AI endpoint connected." />
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "ai" && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ai/10 mr-2 mt-0.5">
                  <Sparkles className="h-3 w-3 text-ai" />
                </div>
              )}
              <div className={cn(
                "max-w-[78%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-ai/8 border border-ai/15 text-foreground rounded-bl-sm",
              )}>
                {m.text}
              </div>
            </div>
          ))}
        </CardContent>
        <div className="border-t p-3 flex gap-2 shrink-0">
          <Input
            className="h-10 text-[13px]"
            placeholder="Ask anything about your projects…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
          />
          <Button className="h-10 px-3" onClick={() => send(input)}><Send className="h-4 w-4" /></Button>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-[13px] font-semibold">Try asking</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}
                className="block text-left w-full text-[12px] px-3 py-2 rounded-lg hover:bg-primary/8 hover:text-primary transition-colors">
                {s}
              </button>
            ))}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
                <Mail className="h-3 w-3" />
              </div>
              Drafted emails
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <div className="p-3 rounded-xl border bg-muted/30">
              <p className="text-[12px] font-semibold">Consolidated PO — 1,000 Bricks</p>
              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">To BuildMart… delivery Oct 24–26…</p>
            </div>
            <div className="p-3 rounded-xl border bg-muted/30">
              <p className="text-[12px] font-semibold">Daily Briefing — Manager group</p>
              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">5 sites updated, 1 delay forecast, 3 POs pending…</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
