import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bot,
  Globe,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import {
  aiChatApi,
  type AiChatSessionResponse,
  type AiChatMessageResponse,
} from "@/api/aiChat";
import { projectsApi } from "@/api/projects";
import { requireApiResult } from "@/api/client";

type View = "list" | "thread" | "new";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function AiChatBot({ isOpen, onClose }: Props) {
  const session = useSession();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("list");
  const [selectedSession, setSelectedSession] = useState<AiChatSessionResponse | null>(null);
  const [compose, setCompose] = useState("");
  const [sending, setSending] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // New session form
  const [newTitle, setNewTitle] = useState("");
  const [newProjectId, setNewProjectId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  // Reset view when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setView("list");
      setSelectedSession(null);
      setCompose("");
    }
  }, [isOpen]);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", "ai-chat"],
    queryFn: async () =>
      requireApiResult(await projectsApi.getAll(), "Could not load projects") ?? [],
    enabled: isOpen && !!session?.token,
    staleTime: 30_000,
  });

  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ["ai-chat-sessions"],
    queryFn: async () => {
      const response = await aiChatApi.getSessions();
      return requireApiResult(response, "Could not load AI chat sessions") ?? [];
    },
    enabled: isOpen && !!session?.token,
    staleTime: 10_000,
    refetchInterval: isOpen ? 15_000 : false,
  });

  const {
    data: messages = [],
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["ai-chat-messages", selectedSession?.sessionId],
    queryFn: async () => {
      const response = await aiChatApi.getMessages(selectedSession!.sessionId);
      return requireApiResult(response, "Could not load AI messages") ?? [];
    },
    enabled: !!selectedSession && view === "thread",
    staleTime: 5_000,
    refetchInterval: view === "thread" ? 8_000 : false,
  });

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const openThread = (session: AiChatSessionResponse) => {
    setSelectedSession(session);
    setView("thread");
    setCompose("");
  };

  const sendMessage = async () => {
    if (!selectedSession || !compose.trim()) return;
    setSending(true);
    try {
      const res = await aiChatApi.sendMessage(selectedSession.sessionId, {
        message: compose.trim(),
        useWebSearch,
      });
      if (res.isSuccess) {
        setCompose("");
        await refetchMessages();
        refetchSessions();
      } else {
        toast.error(res.errorMessage ?? "Could not send message to AI");
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setSending(false);
    }
  };

  const deleteSession = async (sessionId: number) => {
    const res = await aiChatApi.deleteSession(sessionId);
    if (res.isSuccess) {
      if (selectedSession?.sessionId === sessionId) {
        setSelectedSession(null);
        setView("list");
      }
      refetchSessions();
    } else {
      toast.error(res.errorMessage ?? "Could not delete session");
    }
  };

  const createSession = async () => {
    setCreating(true);
    try {
      const res = await aiChatApi.createSession({
        title: newTitle.trim() || undefined,
        projectId: newProjectId ? Number(newProjectId) : undefined,
      });
      if (res.isSuccess) {
        toast.success("AI chat session created");
        setNewTitle("");
        setNewProjectId("");
        await refetchSessions();
        openThread(res.result);
      } else {
        toast.error(res.errorMessage ?? "Could not create AI chat session");
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex h-14 items-center gap-2 border-b px-4 shrink-0">
        {view !== "list" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => {
              setView("list");
              setSelectedSession(null);
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <Bot className="h-4 w-4 text-blue-600 shrink-0" />
        <h2 className="text-sm font-semibold truncate flex-1">
          {view === "list" && "AI Assistant (Gemini + Tavily)"}
          {view === "thread" && (selectedSession?.title ?? "AI Chat")}
          {view === "new" && "New AI Chat"}
        </h2>
        {view === "list" && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setView("new")}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* List View */}
      {view === "list" && (
        <div className="flex flex-1 flex-col min-h-0">
          <ScrollArea className="flex-1">
            {sessionsLoading && (
              <div className="space-y-2 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            )}
            {!sessionsLoading && sessions.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                <Bot className="h-8 w-8 text-blue-600/40" />
                <p className="text-sm text-muted-foreground">No AI chat sessions yet</p>
                <Button variant="outline" size="sm" onClick={() => setView("new")}>
                  <Plus className="mr-1 h-3 w-3" /> Start a conversation
                </Button>
              </div>
            )}
            {sessions.map((session) => (
              <button
                key={session.sessionId}
                type="button"
                onClick={() => openThread(session)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 group"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-300 bg-blue-50 text-blue-600 mt-0.5">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {session.title || "Untitled Conversation"}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {session.lastMessageAt ? timeAgo(session.lastMessageAt) : timeAgo(session.createdAt)}
                    </span>
                  </div>
                  {session.projectId && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Project: {projects.find((p) => p.projectId === session.projectId)?.projectName || `#${session.projectId}`}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.sessionId);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </button>
            ))}
          </ScrollArea>
        </div>
      )}

      {/* Thread View */}
      {view === "thread" && selectedSession && (
        <div className="flex flex-1 flex-col min-h-0">
          {/* Session info */}
          <div className="px-4 py-2 border-b flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-blue-600 shrink-0" />
            <span className="text-xs text-muted-foreground">
              {selectedSession.title || "Untitled Conversation"}
            </span>
            {selectedSession.projectId && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {projects.find((p) => p.projectId === selectedSession.projectId)?.projectName || `#${selectedSession.projectId}`}
                </span>
              </>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="px-4 py-3 space-y-3">
              {messagesLoading && (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              )}
              {!messagesLoading && messages.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">
                  Start a conversation with the AI assistant (Gemini + Tavily) below.
                </p>
              )}
              {messages.map((msg, idx) => {
                const isAi = msg.role === "assistant";
                const showDate =
                  idx === 0 || formatDate(msg.createdAt) !== formatDate(messages[idx - 1].createdAt);

                return (
                  <div key={msg.messageId}>
                    {showDate && (
                      <p className="text-center text-[10px] text-muted-foreground py-2">
                        {formatDate(msg.createdAt)}
                      </p>
                    )}
                    <div className={cn("flex", isAi ? "justify-start" : "justify-end")}>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed group relative",
                          isAi
                            ? "bg-blue-50 border border-blue-200 text-blue-900 rounded-bl-md"
                            : "bg-indigo-600 text-white rounded-br-md",
                        )}
                      >
                        {isAi && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <Bot className="h-3 w-3 text-blue-600" />
                            <span className="text-[10px] font-semibold text-blue-600">AI Assistant</span>
                            {msg.useWebSearch && (
                              <Badge variant="outline" className="text-[8px] px-1 py-0 gap-0.5 border-blue-300 text-blue-700">
                                <Search className="h-2 w-2" />
                                Tavily Search
                              </Badge>
                            )}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <div
                          className={cn(
                            "flex items-center gap-1.5 mt-1",
                            isAi ? "justify-start" : "justify-end",
                          )}
                        >
                          <span className={cn("text-[9px]", isAi ? "text-blue-600/70" : "text-white/70")}>
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Compose */}
          <div className="border-t px-4 py-3 shrink-0 space-y-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={useWebSearch}
                onCheckedChange={setUseWebSearch}
                className="h-5 w-9"
              />
              <Label htmlFor="web-search" className="text-xs cursor-pointer">
                Use Tavily search
              </Label>
              <Search className="h-3 w-3 text-blue-600" />
            </div>
            <div className="flex items-end gap-2">
              <Textarea
                className="min-h-[40px] max-h-[120px] text-sm resize-none flex-1"
                placeholder="Ask the AI assistant (Gemini + Tavily)..."
                value={compose}
                onChange={(e) => setCompose(e.target.value)}
                disabled={sending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={sendMessage}
                disabled={sending || !compose.trim()}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Session View */}
      {view === "new" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <Label className="text-xs">Title (optional)</Label>
            <Input
              className="mt-1 h-8 text-xs"
              placeholder="Conversation title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={100}
            />
          </div>
          <div>
            <Label className="text-xs">Project (optional)</Label>
            <div className="mt-1">
              <select
                className="w-full h-8 text-xs rounded-md border border-input bg-background px-3 py-1"
                value={newProjectId}
                onChange={(e) => setNewProjectId(e.target.value)}
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.projectId} value={String(p.projectId)}>
                    {p.projectName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="pt-4">
            <Button
              className="w-full h-8 text-xs"
              onClick={createSession}
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-3 w-3 text-blue-600" />
                  Start AI Chat
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
