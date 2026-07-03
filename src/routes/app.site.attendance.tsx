import { createFileRoute } from "@tanstack/react-router";
import { BackendUnavailablePage } from "@/components/backend-unavailable";

export const Route = createFileRoute("/app/site/attendance")({
  component: () => <BackendUnavailablePage title="Attendance" endpoint="attendance endpoints" />,
});
