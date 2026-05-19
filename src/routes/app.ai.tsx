import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send, Sparkles, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { aiChatSeed } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

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
      <Card className="flex flex-col">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-ai" /> AI Agent
            <Badge variant="outline" className="bg-ai/10 text-ai border-ai/30 text-[10px]">Connected to project DB</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
              )}>
                {m.text}
              </div>
            </div>
          ))}
        </CardContent>
        <div className="border-t p-3 flex gap-2">
          <Input
            placeholder="Ask anything about your projects…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
          />
          <Button onClick={() => send(input)}><Send className="h-4 w-4" /></Button>
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Try asking</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="block text-left w-full text-xs p-2 rounded-md hover:bg-muted">
                {s}
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Drafted emails</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="p-2 rounded-md border">
              <p className="font-medium">Consolidated PO — 1,000 Bricks</p>
              <p className="text-muted-foreground line-clamp-2 mt-1">To BuildMart… delivery Oct 24–26…</p>
            </div>
            <div className="p-2 rounded-md border">
              <p className="font-medium">Daily Briefing — Manager group</p>
              <p className="text-muted-foreground line-clamp-2 mt-1">5 sites updated, 1 delay forecast, 3 POs pending…</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
