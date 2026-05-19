import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/customer")({ component: () => <Navigate to="/app/portal" /> });
