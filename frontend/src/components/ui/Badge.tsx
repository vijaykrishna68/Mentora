import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeVariant = "neutral" | "sage" | "success" | "warning" | "error";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  neutral: "border-[length:var(--b-hair)] border-line bg-ivory-raised text-charcoal-2",
  sage: "border-transparent bg-sage-tint text-charcoal-2",
  success: "border-transparent bg-success-tint text-success",
  warning: "border-transparent bg-warning-tint text-warning",
  error: "border-transparent bg-error-tint text-error",
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-[11.5px] font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
