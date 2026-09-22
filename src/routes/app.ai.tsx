import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircleOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/app/ai")({
  head: () => ({ meta: [{ title: "Team Chat (Retired) - BuildSense AI" }] }),
  component: RetiredChatPage,
});

// Team chat and AI chat were retired backend-wide (HTTP 410).
// This route remains as a friendly pointer instead of a dead link.
function RetiredChatPage() {
  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader
        section="Communication"
        title="Team Chat"
        description="This feature has been retired."
      />
      <Card className="shadow-sm">
        <CardContent className="flex flex-col items-center p-10 text-center">
          <MessageCircleOff className="mb-3 h-9 w-9 text-muted-foreground" />
          <p className="font-medium">Chat is no longer available</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            All <span className="font-mono">/api/Chat</span> and{" "}
            <span className="font-mono">/api/AiChat</span> endpoints return HTTP 410 Gone.
            Coordinate directly in the project, material-request, and inventory workspaces.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/app/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
