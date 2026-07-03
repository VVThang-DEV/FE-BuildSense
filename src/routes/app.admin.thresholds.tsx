import { createFileRoute } from "@tanstack/react-router";
import { BackendUnavailablePage } from "@/components/backend-unavailable";

export const Route = createFileRoute("/app/admin/thresholds")({
  component: () => <BackendUnavailablePage title="Inventory Thresholds" endpoint="inventory threshold endpoints" />,
});
