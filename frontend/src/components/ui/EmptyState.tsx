import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/** A clear explanation plus a useful next action — never a bare "no results" message. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border-[length:var(--b-hair)] border-dashed border-line px-6 py-12 text-center">
      <p className="font-serif text-lg font-semibold text-charcoal">{title}</p>
      {description && <p className="max-w-sm text-sm text-charcoal-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
