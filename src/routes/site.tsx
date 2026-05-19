import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/site")({ component: () => <Navigate to="/app/site" /> });
