import { useSyncExternalStore } from "react";
import type { Role } from "@/lib/session";

// ────────────────────────────────────────
// Chat prompt data (produced by workflow hooks)
// ────────────────────────────────────────

export type ChatPromptData = {
  projectId: number;
  entityType: "TASK" | "MATERIAL_REQUEST" | "PURCHASE_ORDER" | "PROJECT";
  entityId?: number;
  /** Roles that should receive the message */
  targetRoles: Role[];
  /** Specific user IDs to include as participants (e.g. the project PM) */
  targetUserIds?: number[];
  /** The auto-generated message body shown in the editable textarea */
  suggestedMessage: string;
  /** Title for the conversation (e.g. "Material Request #42") */
  conversationTitle: string;
};

// ────────────────────────────────────────
// Store state
// ────────────────────────────────────────

type ChatStoreState = {
  isDrawerOpen: boolean;
  pendingPrompt: ChatPromptData | null;
  /** When set, the drawer opens to this specific project's conversations */
  activeProjectId: number | null;
};

let state: ChatStoreState = {
  isDrawerOpen: false,
  pendingPrompt: null,
  activeProjectId: null,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): ChatStoreState {
  return state;
}

function getServerSnapshot(): ChatStoreState {
  return { isDrawerOpen: false, pendingPrompt: null, activeProjectId: null };
}

// ────────────────────────────────────────
// Public actions
// ────────────────────────────────────────

export function openChatDrawer(projectId?: number) {
  state = {
    ...state,
    isDrawerOpen: true,
    activeProjectId: projectId ?? state.activeProjectId,
  };
  emit();
}

export function closeChatDrawer() {
  state = { ...state, isDrawerOpen: false };
  emit();
}

export function toggleChatDrawer() {
  state = { ...state, isDrawerOpen: !state.isDrawerOpen };
  emit();
}

export function setChatPrompt(prompt: ChatPromptData) {
  state = { ...state, pendingPrompt: prompt };
  emit();
}

export function clearChatPrompt() {
  state = { ...state, pendingPrompt: null };
  emit();
}

export function setActiveProject(projectId: number | null) {
  state = { ...state, activeProjectId: projectId };
  emit();
}

// ────────────────────────────────────────
// React hook
// ────────────────────────────────────────

export function useChatStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
