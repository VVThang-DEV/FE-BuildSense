import { createFileRoute } from "@tanstack/react-router";
import { BackendUnavailablePage } from "@/components/backend-unavailable";

export const Route = createFileRoute("/app/staff/notifications")({
  component: () => (
    <BackendUnavailablePage title="Notification Rules" endpoint="notification rule endpoints" />
  ),
});
