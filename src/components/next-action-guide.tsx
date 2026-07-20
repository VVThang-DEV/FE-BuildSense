import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type NextAction = {
  id: string;
  title: string;
  description: string;
  to: string;
  buttonLabel: string;
  count?: number;
  state?: "attention" | "ready" | "waiting";
};

export function NextActionGuide({
  actions,
  loading = false,
}: {
  actions: NextAction[];
  loading?: boolean;
}) {
  return (
    <Card className="overflow-hidden border-primary/20 shadow-sm">
      <CardHeader className="border-b bg-primary/[0.04] pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ListChecks className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Recommended next actions</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Based on your role and the current workflow status. Open an action to continue in the
              correct workspace.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-3 p-4" aria-label="Loading recommended actions">
            {[0, 1].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : actions.length === 0 ? (
          <div className="flex items-center gap-3 p-5">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <p className="text-sm font-medium">No immediate action is waiting</p>
              <p className="text-xs text-muted-foreground">
                Your current queues are clear. New work will appear here when a workflow changes.
              </p>
            </div>
          </div>
        ) : (
          <ol className="divide-y">
            {actions.map((action, index) => (
              <li key={action.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    action.state === "attention" &&
                      "border-warning/40 bg-warning/15 text-warning-foreground",
                    action.state === "ready" && "border-primary/30 bg-primary/10 text-primary",
                    action.state === "waiting" &&
                      "border-muted-foreground/25 bg-muted text-muted-foreground",
                  )}
                >
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{action.title}</p>
                    {typeof action.count === "number" && action.count > 0 && (
                      <Badge variant="secondary" className="tabular-nums">
                        {action.count}
                      </Badge>
                    )}
                    {action.state === "waiting" && <Badge variant="outline">Waiting</Badge>}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {action.description}
                  </p>
                </div>
                <Button asChild size="sm" variant={index === 0 ? "default" : "outline"}>
                  <Link to={action.to}>
                    {action.buttonLabel}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
