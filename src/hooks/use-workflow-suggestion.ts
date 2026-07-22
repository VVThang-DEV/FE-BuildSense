import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useSession, type Role } from "@/lib/session";

type WorkflowSuggestion = {
  message: string;
  nextStep: string;
  actionLabel: string;
  to?: string;
  onAction?: () => void;
  actionRoles?: Role[];
  waitingNote?: string;
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
  }: WorkflowSuggestion) => {
    const canAct =
      !actionRoles || (session?.role !== undefined && actionRoles.includes(session.role));

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
        : {}),
    });
  };
}
