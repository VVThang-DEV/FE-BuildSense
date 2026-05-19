import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shared health badge config — used across Projects, Dashboard, WBS, etc. */
export const healthConfig = {
  "on-track": { label: "On Track",  cls: "bg-success/12 text-success border-success/30" },
  "at-risk":  { label: "At Risk",   cls: "bg-warning/20 text-warning-foreground border-warning/40" },
  delayed:    { label: "Delayed",   cls: "bg-destructive/12 text-destructive border-destructive/30" },
} as const;

/** Shared PO status badge config */
export const statusConfig: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Pending",   cls: "bg-warning/15 text-warning-foreground border-warning/35" },
  approved:  { label: "Approved",  cls: "bg-primary/12 text-primary border-primary/30" },
  ordered:   { label: "Ordered",   cls: "bg-ai/12 text-ai border-ai/30" },
  delivered: { label: "Delivered", cls: "bg-success/12 text-success border-success/30" },
  rejected:  { label: "Rejected",  cls: "bg-destructive/12 text-destructive border-destructive/30" },
};
