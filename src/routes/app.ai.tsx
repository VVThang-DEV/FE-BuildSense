import { createFileRoute } from "@tanstack/react-router";
import { BackendUnavailablePage } from "@/components/backend-unavailable";

export const Route = createFileRoute("/app/ai")({
  component: () => <BackendUnavailablePage title="AI Agent" endpoint="AI agent/chat endpoints" />,
});
