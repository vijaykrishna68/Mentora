import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ className, label, id, ...props }, ref) => {
  return (
    <label htmlFor={id} className={cn("inline-flex cursor-pointer items-center gap-2.5 text-sm text-charcoal-2", className)}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="peer sr-only"
        {...props}
      />
      <span
        aria-hidden="true"
        className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-xs border-[length:var(--b-def)] border-line bg-ivory-raised transition-colors duration-[var(--dur-fast)] peer-checked:border-pine peer-checked:bg-pine peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pine"
      >
        <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 text-ivory opacity-0 peer-checked:opacity-100">
          <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {label}
    </label>
  );
});
Checkbox.displayName = "Checkbox";
