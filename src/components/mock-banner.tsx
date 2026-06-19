import { AlertTriangle } from "lucide-react";

/**
 * A compact banner to indicate sections displaying demo/sample data
 * rather than live backend data.
 */
export function MockDataBanner({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-warning/35 bg-warning/8 px-3.5 py-2 text-[12px] text-warning-foreground mb-4">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>{message ?? "Demo data — this section uses sample data for demonstration purposes."}</span>
    </div>
  );
}
