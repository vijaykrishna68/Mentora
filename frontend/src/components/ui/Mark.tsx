import { cn } from "@/lib/utils/cn";

interface MarkProps {
  active: boolean;
  size?: "sm" | "lg";
  className?: string;
}

/**
 * The approved terracotta selection/confirmation mark — a single hand-drawn
 * brush stroke (ported from design/mentora-editorial-direction.html's
 * `#mark-stroke` symbol), not a literal botanical icon. This is the "felt,
 * not announced" botanical influence.
 *
 * Reserved for: a selected offering, a selected time slot, a confirmed
 * booking, and the active profile/dashboard tab. Never a hover indicator, a
 * button decoration, or a repeated pattern — and never the only signal of
 * state (the element it marks always also changes color/weight/border).
 */
export function Mark({ active, size = "sm", className }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 10"
      className={cn(
        "block origin-center text-accent transition-transform duration-[var(--dur-base)] ease-[var(--ease-editorial)]",
        size === "lg" ? "h-[9px] w-11" : "h-[7px] w-[30px]",
        active ? "scale-x-100" : "scale-x-0",
        className,
      )}
    >
      <path d="M2,6 C20,1.5 44,1.5 62,6" stroke="currentColor" strokeWidth="2.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}
