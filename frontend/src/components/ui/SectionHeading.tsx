import type { ReactNode } from "react";

interface SectionHeadingProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function SectionHeading({ title, description, action }: SectionHeadingProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[19px] font-bold leading-tight text-charcoal">{title}</h2>
        {description && <p className="mt-1 text-sm text-charcoal-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
