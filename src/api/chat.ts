import { apiClient } from "./client";

// ────────────────────────────────────────
// Types matching backend Response models
// ────────────────────────────────────────

export type ConversationParticipant = {
  userId: number;
  fullName: string | null;
  email: string | null;
  joinedAt: string;
  lastReadAt: string | null;
};

export type ConversationType = "PROJECT" | "TASK" | "MATERIAL_REQUEST" | "PURCHASE_ORDER";

export type ConversationResponse = {
  conversationId: number;
  projectId: number;
  taskId: number | null;
  title: string;
  type: ConversationType | number;
  lastMessageAt: string;
  participants: ConversationParticipant[];
};

export type MessageResponse = {
  messageId: number;
  conversationId: number;
  senderId: number;
  senderName: string | null;
  body: string;
  attachmentUrl: string | null;
  sentAt: string;
  editedAt: string | null;
  deletedAt: string | null;
};

// ────────────────────────────────────────
// Types matching backend Request models
// ────────────────────────────────────────

export type CreateConversationRequest = {
  projectId: number;
  taskId?: number;
  title: string;
  type?: ConversationType | number;
  participantUserIds: number[];
};

export type SendMessageRequest = {
  body: string;
  attachmentUrl?: string;
};

export type UpdateMessageRequest = {
  body: string;
};

// ────────────────────────────────────────
// Normalization helpers
// ────────────────────────────────────────

const TYPE_BY_NUMBER: Record<number, ConversationType> = {
  0: "PROJECT",
  1: "TASK",
  2: "MATERIAL_REQUEST",
  3: "PURCHASE_ORDER",
};

function normalizeConversationType(
  type: ConversationType | number | string,
): ConversationType {
  if (typeof type === "number") return TYPE_BY_NUMBER[type] ?? "PROJECT";
  const upper = String(type).toUpperCase();
  if (upper in TYPE_BY_NUMBER) return upper as ConversationType;
  if (["PROJECT", "TASK", "MATERIAL_REQUEST", "PURCHASE_ORDER"].includes(upper))
    return upper as ConversationType;
  return "PROJECT";
}

function normalizeConversation(c: ConversationResponse): ConversationResponse {
  return { ...c, type: normalizeConversationType(c.type) };
}

// ────────────────────────────────────────
// Chat API client
// ────────────────────────────────────────

export const chatApi = {
  /** Create a new conversation */
  createConversation: async (body: CreateConversationRequest) => {
    const response = await apiClient.post<ConversationResponse>(
      "/api/chat/conversations",
      body,
    );
    return {
      ...response,
      result: response.result ? normalizeConversation(response.result) : response.result,
    };
  },

  /** List conversations the current user participates in for a project */
  getProjectConversations: async (projectId: number) => {
    const response = await apiClient.get<ConversationResponse[]>(
      `/api/chat/projects/${projectId}/conversations`,
    );
    return {
      ...response,
      result: (response.result ?? []).map(normalizeConversation),
    };
  },

  /** Get messages in a conversation */
  getMessages: (conversationId: number) =>
    apiClient.get<MessageResponse[]>(
      `/api/chat/conversations/${conversationId}/messages`,
    ),

  /** Send a message to a conversation */
  sendMessage: (conversationId: number, body: SendMessageRequest) =>
    apiClient.post<MessageResponse>(
      `/api/chat/conversations/${conversationId}/messages`,
      body,
    ),

  /** Edit a message (sender only) */
  updateMessage: (messageId: number, body: UpdateMessageRequest) =>
    apiClient.put<MessageResponse>(`/api/chat/messages/${messageId}`, body),

  /** Soft-delete a message (sender only) */
  deleteMessage: (messageId: number) =>
    apiClient.delete<MessageResponse>(`/api/chat/messages/${messageId}`),

  /** Mark a conversation as read for the current user */
  markRead: (conversationId: number) =>
    apiClient.put<string>(`/api/chat/conversations/${conversationId}/read`),
};
