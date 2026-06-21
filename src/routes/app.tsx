import { createFileRoute, Navigate, useRouterState } from "@tanstack/react-router";
import { ROLE_HOME, useSession, useMounted } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { isPathAllowedForRole } from "@/lib/nav";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const session = useSession();
  const mounted = useMounted();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!mounted) return null;
  if (!session) return <Navigate to="/login" />;
  if (!isPathAllowedForRole(session.role, pathname)) {
    return <Navigate to={ROLE_HOME[session.role]} />;
  }
  return <AppShell session={session} />;
}
