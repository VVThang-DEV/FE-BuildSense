import type { ReactNode } from "react";

interface PageHeaderProps {
  section?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ section, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
      <div>
        {section && (
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-1">
            {section}
          </p>
        )}
        <h1 className="text-[1.65rem] font-bold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
