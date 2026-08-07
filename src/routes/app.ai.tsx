import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Hash,
  MessageCircle,
  Plus,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { useSession, ROLE_LABELS } from "@/lib/session";
import {
  chatApi,
  type ConversationResponse,
  type ConversationType,
} from "@/api/chat";
import { projectsApi } from "@/api/projects";
import { usersApi } from "@/api/users";
import { requireApiResult } from "@/api/client";

export const Route = createFileRoute("/app/ai")({
  head: () => ({ meta: [{ title: "Team Chat - BuildSense AI" }] }),
  component: TeamChatPage,
});

const TYPE_LABEL: Record<string, string> = {
  PROJECT: "Project",
  TASK: "Task",
  MATERIAL_REQUEST: "Material Request",
  PURCHASE_ORDER: "Purchase Order",
};

const TYPE_COLORS: Record<string, string> = {
  PROJECT: "border-primary/30 bg-primary/10 text-primary",
  TASK: "border-success/30 bg-success/10 text-success",
  MATERIAL_REQUEST: "border-warning/35 bg-warning/10 text-warning-foreground",
  PURCHASE_ORDER: "border-ai/30 bg-ai/10 text-ai",
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

function TeamChatPage() {
  const session = useSession();
  const isAdmin = session?.role === "ADMIN";
  const isLive = !!session?.token;
  const [projectId, setProjectId] = useState("");
  const [selectedConv, setSelectedConv] = useState<ConversationResponse | null>(null);
  const [compose, setCompose] = useState("");
  const [sending, setSending] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<ConversationType>("PROJECT");
  const [newParticipants, setNewParticipants] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", "team-chat-page"],
    queryFn: async () =>
      requireApiResult(await projectsApi.getAll(), "Could not load projects") ?? [],
    enabled: isLive,
    staleTime: 30_000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users", "team-chat-page"],
    queryFn: async () =>
      requireApiResult(await usersApi.getAll(), "Could not load users") ?? [],
    enabled: isLive && isAdmin,
    staleTime: 30_000,
  });

  const currentProjectId = projectId || (projects[0] ? String(projects[0].projectId) : "");

  const {
    data: conversations = [],
    isLoading: convsLoading,
    refetch: refetchConvs,
  } = useQuery({
    queryKey: ["chat-conversations", "page", currentProjectId],
    queryFn: async () =>
      requireApiResult(
        await chatApi.getProjectConversations(Number(currentProjectId)),
        "Could not load conversations",
      ) ?? [],
    enabled: isLive && !!currentProjectId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const {
    data: messages = [],
    isLoading: msgsLoading,
    refetch: refetchMsgs,
  } = useQuery({
    queryKey: ["chat-messages", "page", selectedConv?.conversationId],
    queryFn: async () =>
      requireApiResult(
        await chatApi.getMessages(selectedConv!.conversationId),
        "Could not load messages",
      ) ?? [],
    enabled: !!selectedConv,
    staleTime: 5_000,
    refetchInterval: 8_000,
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (selectedConv) chatApi.markRead(selectedConv.conversationId).catch(() => {});
  }, [selectedConv]);

  const sendMessage = async () => {
    if (!selectedConv || !compose.trim()) return;
    setSending(true);
    try {
      const res = await chatApi.sendMessage(selectedConv.conversationId, { body: compose.trim() });
      if (res.isSuccess) { setCompose(""); await refetchMsgs(); refetchConvs(); }
      else toast.error(res.errorMessage ?? "Could not send message");
    } catch { toast.error("Could not reach the backend"); }
    finally { setSending(false); }
  };

  const deleteMsg = async (id: number) => {
    const res = await chatApi.deleteMessage(id);
    if (res.isSuccess) refetchMsgs();
    else toast.error(res.errorMessage ?? "Could not delete message");
  };

  const otherUsers = allUsers.filter((u) => u.id !== session?.userId);

  const createConversation = async () => {
    if (!newTitle.trim() || !currentProjectId) { toast.error("Title and project are required"); return; }
    setCreating(true);
    try {
      const res = await chatApi.createConversation({
        projectId: Number(currentProjectId),
        title: newTitle.trim(),
        type: newType,
        participantUserIds: newParticipants,
      });
      if (res.isSuccess) {
        toast.success("Conversation created");
        setNewOpen(false); setNewTitle(""); setNewParticipants([]);
        await refetchConvs();
        setSelectedConv(res.result);
      } else toast.error(res.errorMessage ?? "Could not create conversation");
    } catch { toast.error("Could not reach the backend"); }
    finally { setCreating(false); }
  };

  if (!isLive) {
    return (
      <div className="max-w-[1200px] mx-auto">
        <PageHeader section="Communication" title="Team Chat" description="Sign in to access team chat." />
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Chat requires an authenticated session.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        section="Communication"
        title="Team Chat"
        description="Collaborate with your team across projects, tasks, and workflow handoffs."
        actions={
          isAdmin ? (
            <Button size="sm" className="h-8 text-xs" onClick={() => setNewOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New conversation
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Conversation list */}
        <Card className="flex flex-col overflow-hidden">
          <div className="p-3 border-b shrink-0">
            <Select value={currentProjectId} onValueChange={(v) => { setProjectId(v); setSelectedConv(null); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.projectId} value={String(p.projectId)}>{p.projectName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="flex-1">
            {convsLoading && <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div>}
            {!convsLoading && conversations.length === 0 && (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <Hash className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Ask your Admin to create a conversation for this project.
                  </p>
                )}
              </div>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.conversationId}
                type="button"
                onClick={() => { setSelectedConv(conv); setCompose(""); }}
                className={cn(
                  "w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors border-b border-border/50",
                  selectedConv?.conversationId === conv.conversationId ? "bg-primary/5" : "hover:bg-muted/50",
                )}
              >
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold mt-0.5", TYPE_COLORS[String(conv.type)] ?? TYPE_COLORS.PROJECT)}>
                  <MessageCircle className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(conv.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">{TYPE_LABEL[String(conv.type)] ?? "Chat"}</Badge>
                    <span className="text-[10px] text-muted-foreground">{conv.participants.length} members</span>
                  </div>
                </div>
              </button>
            ))}
          </ScrollArea>
        </Card>

        {/* Thread */}
        <Card className="flex flex-col overflow-hidden">
          {!selectedConv ? (
            <CardContent className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p>Select a conversation to start chatting</p>
              </div>
            </CardContent>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
                <MessageCircle className="h-4 w-4 text-primary shrink-0" />
                <h3 className="text-sm font-semibold truncate flex-1">{selectedConv.title}</h3>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  {selectedConv.participants.slice(0, 3).map((p) => (
                    <Badge key={p.userId} variant="outline" className="text-[9px] px-1 py-0 font-normal">{p.fullName ?? `#${p.userId}`}</Badge>
                  ))}
                  {selectedConv.participants.length > 3 && <Badge variant="outline" className="text-[9px] px-1 py-0">+{selectedConv.participants.length - 3}</Badge>}
                </div>
              </div>
              <ScrollArea className="flex-1" ref={scrollRef}>
                <div className="px-4 py-3 space-y-3">
                  {msgsLoading && <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}</div>}
                  {!msgsLoading && messages.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">No messages yet.</p>}
                  {messages.map((msg, idx) => {
                    const isOwn = msg.senderId === session?.userId;
                    const isDeleted = !!msg.deletedAt;
                    const showDate = idx === 0 || formatDate(msg.sentAt) !== formatDate(messages[idx - 1].sentAt);
                    return (
                      <div key={msg.messageId}>
                        {showDate && <p className="text-center text-[10px] text-muted-foreground py-2">{formatDate(msg.sentAt)}</p>}
                        <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[70%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed group relative",
                            isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md",
                            isDeleted && "opacity-50 italic",
                          )}>
                            {!isOwn && <p className="text-[10px] font-semibold mb-0.5 text-foreground/60">{msg.senderName ?? "User"}</p>}
                            <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                            <div className={cn("flex items-center gap-1.5 mt-1", isOwn ? "justify-end" : "justify-start")}>
                              <span className={cn("text-[9px]", isOwn ? "text-primary-foreground/50" : "text-muted-foreground")}>
                                {formatTime(msg.sentAt)}{msg.editedAt && " · edited"}
                              </span>
                              {isOwn && !isDeleted && (
                                <button type="button" onClick={() => deleteMsg(msg.messageId)} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary-foreground/40 hover:text-primary-foreground/80"><Trash2 className="h-2.5 w-2.5" /></button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <div className="border-t px-4 py-3 shrink-0">
                <div className="flex items-end gap-2">
                  <Textarea
                    className="min-h-[40px] max-h-[120px] text-sm resize-none flex-1"
                    placeholder="Type a message…"
                    value={compose}
                    onChange={(e) => setCompose(e.target.value)}
                    disabled={sending}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  />
                  <Button size="icon" className="h-9 w-9 shrink-0" onClick={sendMessage} disabled={sending || !compose.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* New conversation dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New conversation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Title</Label>
              <Input className="mt-1 h-8 text-xs" placeholder="Conversation title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={100} />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as ConversationType)}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROJECT">Project</SelectItem>
                  <SelectItem value="TASK">Task</SelectItem>
                  <SelectItem value="MATERIAL_REQUEST">Material Request</SelectItem>
                  <SelectItem value="PURCHASE_ORDER">Purchase Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Add participants</Label>
              <div className="mt-1.5 space-y-1 max-h-[200px] overflow-y-auto">
                {otherUsers.map((u) => (
                  <button key={u.id} type="button" onClick={() => setNewParticipants((prev) => prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id])}
                    className={cn("w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors", newParticipants.includes(u.id) ? "bg-primary/10 border border-primary/30" : "hover:bg-muted border border-transparent")}>
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold">{(u.firstName?.[0] ?? "") + (u.lastName?.[0] ?? "")}</div>
                    <span className="truncate flex-1 text-left">{u.firstName} {u.lastName}</span>
                    <Badge variant="outline" className="text-[8px] px-1 py-0">{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}</Badge>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={createConversation} disabled={creating || !newTitle.trim()}>
              <MessageCircle className="mr-1.5 h-3.5 w-3.5" />{creating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
