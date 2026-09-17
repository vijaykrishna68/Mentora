import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md border-[length:var(--b-hair)] border-line bg-ivory-raised shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
