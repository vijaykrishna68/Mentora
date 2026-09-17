import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

/** Toggle control (mockup's `.switch`) — e.g. the mentor's "Accepting bookings" toggle. */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(({ className, label, id, ...props }, ref) => {
  return (
    <label htmlFor={id} className={cn("inline-flex cursor-pointer items-center gap-2.5 text-sm text-charcoal-2", className)}>
      <input ref={ref} id={id} type="checkbox" role="switch" className="peer sr-only" {...props} />
      <span
        aria-hidden="true"
        className="relative h-5 w-9 flex-none rounded-full border-[length:var(--b-hair)] border-line bg-ivory-sunken transition-colors duration-[var(--dur-fast)] peer-checked:border-success peer-checked:bg-success peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pine after:absolute after:left-0.5 after:top-0.5 after:h-3.5 after:w-3.5 after:rounded-full after:bg-charcoal-faint after:transition-transform after:duration-[var(--dur-fast)] peer-checked:after:translate-x-4 peer-checked:after:bg-ivory"
      />
      {label}
    </label>
  );
});
Switch.displayName = "Switch";
