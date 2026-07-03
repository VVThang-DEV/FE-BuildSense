import { createFileRoute } from "@tanstack/react-router";
import { BackendUnavailablePage } from "@/components/backend-unavailable";

export const Route = createFileRoute("/app/site/report")({
  component: () => <BackendUnavailablePage title="Daily Report" endpoint="daily progress report endpoints" />,
});
