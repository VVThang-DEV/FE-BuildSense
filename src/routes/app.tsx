import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useSession, useMounted } from "@/lib/session";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const session = useSession();
  const mounted = useMounted();
  if (!mounted) return null;
  if (!session) return <Navigate to="/login" />;
  return <AppShell session={session} />;
}
