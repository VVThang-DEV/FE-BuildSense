import { createFileRoute } from "@tanstack/react-router";
import { BackendUnavailablePage } from "@/components/backend-unavailable";

export const Route = createFileRoute("/app/check")({
  component: () => (
    <BackendUnavailablePage title="Daily Check" endpoint="daily material check endpoints" />
  ),
});
