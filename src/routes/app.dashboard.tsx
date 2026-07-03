import { createFileRoute } from "@tanstack/react-router";
import { BackendUnavailablePage } from "@/components/backend-unavailable";

export const Route = createFileRoute("/app/dashboard")({
  component: () => <BackendUnavailablePage title="Dashboard" endpoint="dashboard/KPI endpoints" />,
});
