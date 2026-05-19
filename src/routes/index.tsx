import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ROLE_HOME, useSession, useMounted } from "@/lib/session";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const session = useSession();
  const mounted = useMounted();
  if (!mounted) return null;
  return <Navigate to={session ? ROLE_HOME[session.role] : "/login"} />;
}
