import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

type WorkflowSuggestion = {
  message: string;
  nextStep: string;
  actionLabel: string;
  to?: string;
  onAction?: () => void;
};

export function useWorkflowSuggestion() {
  const navigate = useNavigate();

  return ({ message, nextStep, to, actionLabel, onAction }: WorkflowSuggestion) => {
    toast.success(message, {
      description: `Next: ${nextStep}`,
      duration: 10_000,
      action: {
        label: actionLabel,
        onClick: () => {
          if (onAction) onAction();
          else if (to) navigate({ to });
        },
      },
    });
  };
}
