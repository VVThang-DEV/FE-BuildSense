import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { requireApiResult } from "@/api/client";
import { taskIssuesApi } from "@/api/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QueryError } from "@/components/query-error";

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

/**
 * Work-problem thread for a task. Workers and the owning PM can report;
 * resolving is PM-only. Workers see the status flip on refetch.
 */
export function TaskIssues({
  taskId,
  canReport,
  canResolve,
}: {
  taskId: number;
  canReport: boolean;
  canResolve: boolean;
}) {
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [reporting, setReporting] = useState(false);
  const [resolving, setResolving] = useState<{ issueId: number; rowVersion: string } | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [busy, setBusy] = useState(false);

  const {
    data: issues = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["task-issues", taskId],
    queryFn: async () =>
      requireApiResult(await taskIssuesApi.listByTask(taskId), "Could not load work problems") ??
      [],
    enabled: taskId > 0,
    staleTime: 10_000,
  });

  const submitReport = async () => {
    if (!description.trim()) {
      toast.error("Describe the work problem first");
      return;
    }
    setReporting(true);
    try {
      const response = await taskIssuesApi.report(taskId, {
        description: description.trim(),
        photoUrl: photoUrl.trim() || undefined,
      });
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Could not report the problem");
        return;
      }
      toast.success("Problem reported — the PM has been notified in the queue");
      setDescription("");
      setPhotoUrl("");
      await refetch();
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setReporting(false);
    }
  };

  const submitResolve = async () => {
    if (!resolving) return;
    setBusy(true);
    try {
      const response = await taskIssuesApi.resolve(resolving.issueId, {
        resolutionNote: resolutionNote.trim() || undefined,
        rowVersion: resolving.rowVersion,
      });
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Could not resolve the problem");
        if (response.statusCode === 409) await refetch();
        return;
      }
      toast.success("Problem resolved");
      setResolving(null);
      setResolutionNote("");
      await refetch();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-warning-foreground" />
        <p className="text-sm font-medium">Work problems ({issues.length})</p>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading problems...</p>
      ) : isError ? (
        <QueryError
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      ) : issues.length === 0 ? (
        <p className="text-xs text-muted-foreground">No problems reported for this task.</p>
      ) : (
        <ul className="space-y-2">
          {issues.map((issue) => (
            <li key={issue.issueId} className="rounded-md bg-muted/40 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {issue.status === "OPEN" ? "Open" : "Resolved"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {issue.reportedByName ?? `User #${issue.reportedByUserId}`} ·{" "}
                  {formatDateTime(issue.createdAt)}
                </span>
                {canResolve && issue.status === "OPEN" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-7 text-xs"
                    onClick={() =>
                      setResolving({ issueId: issue.issueId, rowVersion: issue.rowVersion })
                    }
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Resolve
                  </Button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words">{issue.description}</p>
              {issue.photoUrl && (
                <a
                  href={issue.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary underline-offset-4 hover:underline"
                >
                  View photo
                </a>
              )}
              {issue.resolutionNote && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Resolution: {issue.resolutionNote}
                  {issue.resolvedAt ? ` (${formatDateTime(issue.resolvedAt)})` : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {canReport && (
        <div className="grid gap-2 border-t pt-3">
          <Label htmlFor={`issue-description-${taskId}`}>Report a problem</Label>
          <Textarea
            id={`issue-description-${taskId}`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={2000}
            placeholder="Blocked material, unsafe condition, drawing mismatch..."
            disabled={reporting}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={photoUrl}
              onChange={(event) => setPhotoUrl(event.target.value)}
              placeholder="Photo URL (optional, https)"
              disabled={reporting}
              className="flex-1"
            />
            <Button size="sm" onClick={submitReport} disabled={reporting || !description.trim()}>
              {reporting ? "Reporting..." : "Report problem"}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={resolving !== null} onOpenChange={(open) => !open && !busy && setResolving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve problem</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="issue-resolution-note">Resolution note (optional)</Label>
            <Textarea
              id="issue-resolution-note"
              value={resolutionNote}
              onChange={(event) => setResolutionNote(event.target.value)}
              maxLength={1000}
              disabled={busy}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolving(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submitResolve} disabled={busy}>
              {busy ? "Resolving..." : "Mark resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
