import { createFileRoute } from "@tanstack/react-router";
import { BackendUnavailablePage } from "@/components/backend-unavailable";

export const Route = createFileRoute("/app/admin/wbs")({
  component: () => (
    <BackendUnavailablePage title="WBS & Baseline" endpoint="WBS/task baseline endpoints" />
  ),
});
