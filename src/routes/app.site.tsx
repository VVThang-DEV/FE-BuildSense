import { createFileRoute } from "@tanstack/react-router";
import { BackendUnavailablePage } from "@/components/backend-unavailable";

export const Route = createFileRoute("/app/site")({
  component: () => <BackendUnavailablePage title="Site Operations" endpoint="site operations endpoints" />,
});
