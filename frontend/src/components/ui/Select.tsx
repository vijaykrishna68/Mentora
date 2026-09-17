import { type SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";
import { fieldControlClass } from "./fieldStyles";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => {
  return (
    <select ref={ref} className={cn(fieldControlClass, "cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
});
Select.displayName = "Select";
