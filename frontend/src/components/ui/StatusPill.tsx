import { cn } from "@/lib/utils/cn";

interface StatusPillProps {
  on: boolean;
  label: string;
  className?: string;
}

/** Paired dot + label so state never rests on color alone (the dot position/label text carry it too). */
export function StatusPill({ on, label, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xs px-2.5 py-[5px] text-xs font-semibold",
        on ? "bg-success-tint text-success" : "bg-ivory-sunken text-charcoal-faint",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("h-[7px] w-[7px] rounded-full", on ? "bg-success" : "bg-charcoal-faint")} />
      {label}
    </span>
  );
}
