import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useSession, type Role } from "@/lib/session";
import { setChatPrompt, type ChatPromptData } from "@/hooks/use-chat-store";

type WorkflowSuggestion = {
  message: string;
  nextStep: string;
  actionLabel: string;
  to?: string;
  onAction?: () => void;
  actionRoles?: Role[];
  waitingNote?: string;
  /** When provided and the next step requires a different role, a chat prompt dialog opens. */
  chatPrompt?: ChatPromptData;
};

export function useWorkflowSuggestion() {
  const navigate = useNavigate();
  const session = useSession();

  return ({
    message,
    nextStep,
    to,
    actionLabel,
    onAction,
    actionRoles,
    waitingNote,
    chatPrompt,
  }: WorkflowSuggestion) => {
    const canAct =
      !actionRoles || (session?.role !== undefined && actionRoles.includes(session.role));

    // If the current user can't perform the next step and we have a chat prompt,
    // trigger the workflow chat prompt dialog so they can notify the responsible person.
    if (!canAct && chatPrompt) {
      setChatPrompt(chatPrompt);
    }

    toast.success(message, {
      description: canAct
        ? `Next: ${nextStep}`
        : `Next: ${nextStep}. ${waitingNote ?? "This step is waiting for another role."}`,
      duration: 10_000,
      ...(canAct
        ? {
            action: {
              label: actionLabel,
              onClick: () => {
                if (onAction) onAction();
                else if (to) navigate({ to });
              },
            },
          }
        : chatPrompt
          ? {
              action: {
                label: "💬 Notify via chat",
                onClick: () => setChatPrompt(chatPrompt),
              },
            }
          : {}),
    });
  };
}
