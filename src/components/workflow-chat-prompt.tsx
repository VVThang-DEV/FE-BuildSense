import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle, Send, X, Users, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useChatStore, clearChatPrompt, type ChatPromptData } from "@/hooks/use-chat-store";
import { chatApi, type ConversationType } from "@/api/chat";
import { usersApi } from "@/api/users";
import { requireApiResult } from "@/api/client";
import { useSession, ROLE_LABELS, type Role } from "@/lib/session";

const ENTITY_LABELS: Record<ChatPromptData["entityType"], string> = {
  TASK: "Task",
  MATERIAL_REQUEST: "Material Request",
  PURCHASE_ORDER: "Purchase Order",
  PROJECT: "Project",
};

const ENTITY_TO_CONVERSATION_TYPE: Record<ChatPromptData["entityType"], ConversationType> = {
  TASK: "TASK",
  MATERIAL_REQUEST: "MATERIAL_REQUEST",
  PURCHASE_ORDER: "PURCHASE_ORDER",
  PROJECT: "PROJECT",
};

function roleTargetLabel(roles: Role[]): string {
  return roles.map((r) => ROLE_LABELS[r]).join(", ");
}

export function WorkflowChatPrompt() {
  const { pendingPrompt } = useChatStore();
  const session = useSession();
  const isAdmin = session?.role === "ADMIN";
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const isOpen = pendingPrompt !== null;

  // Initialize messageBody from the prompt when it first appears
  if (pendingPrompt && !initialized) {
    setMessageBody(pendingPrompt.suggestedMessage);
    setInitialized(true);
  }

  // Reset when dialog closes
  const handleClose = () => {
    clearChatPrompt();
    setMessageBody("");
    setInitialized(false);
  };

  // Load users to resolve target recipients (admin-only endpoint)
  const { data: allUsers = [] } = useQuery({
    queryKey: ["users", "chat-prompt"],
    queryFn: async () =>
      requireApiResult(await usersApi.getAll(), "Could not load users") ?? [],
    enabled: isOpen && !!session?.token && isAdmin,
    staleTime: 30_000,
  });

  // Resolve target user IDs from roles + explicit IDs
  const targetUsers = pendingPrompt
    ? allUsers.filter((user) => {
        // Include explicitly targeted user IDs
        if (pendingPrompt.targetUserIds?.includes(user.id)) return true;
        // Include users matching the target roles (exclude self)
        if (
          pendingPrompt.targetRoles.includes(user.role as Role) &&
          user.id !== session?.userId
        ) {
          return true;
        }
        return false;
      })
    : [];

  const sendChatMessage = async () => {
    if (!pendingPrompt || !session?.userId) return;
    if (!messageBody.trim()) {
      toast.error("Message cannot be empty");
      return;
    }
    if (targetUsers.length === 0) {
      toast.error("No recipients found for the target role");
      return;
    }

    setSending(true);
    try {
      // Create conversation with all target users as participants
      const convResponse = await chatApi.createConversation({
        projectId: pendingPrompt.projectId,
        taskId: pendingPrompt.entityType === "TASK" ? pendingPrompt.entityId : undefined,
        title: pendingPrompt.conversationTitle,
        type: ENTITY_TO_CONVERSATION_TYPE[pendingPrompt.entityType],
        participantUserIds: targetUsers.map((u) => u.id),
      });

      if (!convResponse.isSuccess) {
        toast.error(
          convResponse.errorMessage ?? "Could not create conversation",
        );
        return;
      }

      const conversationId = convResponse.result.conversationId;

      // Send the message
      const msgResponse = await chatApi.sendMessage(conversationId, {
        body: messageBody.trim(),
      });

      if (!msgResponse.isSuccess) {
        toast.error(msgResponse.errorMessage ?? "Could not send message");
        return;
      }

      toast.success("Message sent!", {
        description: `Notified ${targetUsers.map((u) => `${u.firstName} ${u.lastName}`).join(", ")}`,
        duration: 5_000,
      });

      handleClose();
    } catch {
      toast.error("Could not reach the backend. Check the API server and try again.");
    } finally {
      setSending(false);
    }
  };

  if (!pendingPrompt) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ai/10 text-ai">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span>Notify team member</span>
              <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                Auto-generated message for the next workflow step
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context badge */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <MessageCircle className="mr-1 h-3 w-3" />
              {ENTITY_LABELS[pendingPrompt.entityType]}
              {pendingPrompt.entityId ? ` #${pendingPrompt.entityId}` : ""}
            </Badge>
            <Badge
              variant="secondary"
              className="border-ai/20 bg-ai/5 text-ai text-xs"
            >
              <Users className="mr-1 h-3 w-3" />
              To: {roleTargetLabel(pendingPrompt.targetRoles)}
            </Badge>
          </div>

          {/* Recipients */}
          {targetUsers.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Recipients</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {targetUsers.map((user) => (
                  <Badge key={user.id} variant="outline" className="text-xs font-normal">
                    {user.firstName} {user.lastName}
                    <span className="ml-1 opacity-50">({user.role})</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {targetUsers.length === 0 && !isAdmin && (
            <p className="text-xs text-muted-foreground">
              Only admins can send workflow notifications. Ask your Admin to set up a conversation for this project.
            </p>
          )}

          {targetUsers.length === 0 && isAdmin && allUsers.length > 0 && (
            <p className="text-xs text-destructive">
              No users with {roleTargetLabel(pendingPrompt.targetRoles)} role found in the system.
            </p>
          )}

          {/* Editable message */}
          <div>
            <Label htmlFor="chat-prompt-message" className="text-xs text-muted-foreground">
              Message (editable)
            </Label>
            <Textarea
              id="chat-prompt-message"
              className="mt-1.5 min-h-[120px] text-sm leading-relaxed resize-none"
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              disabled={sending}
              placeholder="Write your message..."
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              This message was auto-generated based on your workflow action. Feel free to edit it before sending.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={sending}>
            <X className="mr-1 h-3.5 w-3.5" />
            Skip
          </Button>
          <Button
            size="sm"
            onClick={sendChatMessage}
            disabled={sending || !messageBody.trim() || targetUsers.length === 0}
            className="bg-ai hover:bg-ai/90 text-ai-foreground"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {sending ? "Sending…" : "Send message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
