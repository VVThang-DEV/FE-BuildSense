import { apiClient } from "./client";

// ────────────────────────────────────────
// Types matching backend Response models
// ────────────────────────────────────────

export type AiChatSessionResponse = {
  sessionId: number;
  userId: number;
  title: string | null;
  projectId: number | null;
  createdAt: string;
  lastMessageAt: string | null;
  messageCount?: number;
};

export type AiChatMessageResponse = {
  messageId: number;
  sessionId: number;
  role: "user" | "assistant";
  content: string;
  useWebSearch: boolean;
  createdAt: string;
  sentAt?: string;
};

export type AiChatReplyResponse = {
  message: AiChatMessageResponse;
  userMessage?: AiChatMessageResponse;
  assistantMessage?: AiChatMessageResponse;
  webSearchUsed: boolean;
  webSearchSummary: string | null;
};

// ────────────────────────────────────────
// Types matching backend Request models
// ────────────────────────────────────────

export type CreateAiChatSessionRequest = {
  title?: string;
  projectId?: number;
};

export type SendAiChatMessageRequest = {
  message: string;
  useWebSearch?: boolean;
};

type RawAiChatSessionResponse = Partial<AiChatSessionResponse>;

type RawAiChatMessageResponse = Partial<AiChatMessageResponse> & {
  sentAt?: string;
};

type RawAiChatReplyResponse = Partial<AiChatReplyResponse> & {
  message?: RawAiChatMessageResponse;
  userMessage?: RawAiChatMessageResponse;
  assistantMessage?: RawAiChatMessageResponse;
};

function normalizeMessage(message: RawAiChatMessageResponse): AiChatMessageResponse {
  const createdAt = message.createdAt ?? message.sentAt ?? "";
  return {
    messageId: message.messageId ?? 0,
    sessionId: message.sessionId ?? 0,
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content ?? "",
    useWebSearch: message.useWebSearch ?? false,
    createdAt,
    sentAt: message.sentAt ?? createdAt,
  };
}

function normalizeSession(session: RawAiChatSessionResponse): AiChatSessionResponse {
  return {
    sessionId: session.sessionId ?? 0,
    userId: session.userId ?? 0,
    title: session.title ?? null,
    projectId: session.projectId ?? null,
    createdAt: session.createdAt ?? "",
    lastMessageAt: session.lastMessageAt ?? null,
    messageCount: session.messageCount,
  };
}

function normalizeReply(reply: RawAiChatReplyResponse): AiChatReplyResponse {
  const userMessage = reply.userMessage ? normalizeMessage(reply.userMessage) : undefined;
  const assistantMessage = reply.assistantMessage
    ? normalizeMessage(reply.assistantMessage)
    : undefined;
  const message = normalizeMessage(reply.message ?? reply.assistantMessage ?? {});

  return {
    message,
    userMessage,
    assistantMessage,
    webSearchUsed: reply.webSearchUsed ?? message.useWebSearch,
    webSearchSummary: reply.webSearchSummary ?? null,
  };
}

// ────────────────────────────────────────
// AI Chat API client
// ────────────────────────────────────────

export const aiChatApi = {
  /** Create a new AI chat session */
  createSession: async (body: CreateAiChatSessionRequest) => {
    const response = await apiClient.post<RawAiChatSessionResponse>("/api/AiChat/sessions", body);
    return {
      ...response,
      result: response.result ? normalizeSession(response.result) : response.result,
    };
  },

  /** Get all AI chat sessions for the current user */
  getSessions: async () => {
    const response = await apiClient.get<RawAiChatSessionResponse[]>("/api/AiChat/sessions");
    return {
      ...response,
      result: (response.result ?? []).map(normalizeSession),
    };
  },

  /** Get messages in an AI chat session */
  getMessages: async (sessionId: number) => {
    const response = await apiClient.get<RawAiChatMessageResponse[]>(
      `/api/AiChat/sessions/${sessionId}/messages`,
    );
    return {
      ...response,
      result: (response.result ?? []).map(normalizeMessage),
    };
  },

  /** Send a message to an AI chat session and get AI reply */
  sendMessage: async (sessionId: number, body: SendAiChatMessageRequest) => {
    const response = await apiClient.post<RawAiChatReplyResponse>(
      `/api/AiChat/sessions/${sessionId}/messages`,
      body,
    );
    return {
      ...response,
      result: response.result ? normalizeReply(response.result) : response.result,
    };
  },

  /** Delete an AI chat session */
  deleteSession: async (sessionId: number) => {
    const response = await apiClient.delete<string>(`/api/AiChat/sessions/${sessionId}`);
    return response;
  },
};
