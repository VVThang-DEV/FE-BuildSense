import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QueryError({
  message = "This data could not be loaded.",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium">Unable to load data</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">{message}</p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onRetry}>
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}
