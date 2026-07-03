import { createFileRoute } from "@tanstack/react-router";
import { BackendUnavailablePage } from "@/components/backend-unavailable";

export const Route = createFileRoute("/app/site/")({
  component: () => <BackendUnavailablePage title="Today on Site" endpoint="site task endpoints" />,
});
