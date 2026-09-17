import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";
import { fieldControlClass } from "./fieldStyles";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return <input ref={ref} className={cn(fieldControlClass, className)} {...props} />;
});
Input.displayName = "Input";
