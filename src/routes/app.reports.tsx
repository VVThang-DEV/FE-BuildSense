import { createFileRoute } from "@tanstack/react-router";
import { BackendUnavailablePage } from "@/components/backend-unavailable";

export const Route = createFileRoute("/app/reports")({
  component: () => <BackendUnavailablePage title="Reports" endpoint="reports endpoints" />,
});
