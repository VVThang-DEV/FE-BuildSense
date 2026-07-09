import { createFileRoute } from "@tanstack/react-router";
import { BackendUnavailablePage } from "@/components/backend-unavailable";

export const Route = createFileRoute("/app/portal")({
  component: () => (
    <BackendUnavailablePage title="Customer Portal" endpoint="customer portal endpoints" />
  ),
});
