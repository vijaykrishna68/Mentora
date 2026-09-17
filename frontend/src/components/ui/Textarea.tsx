import { type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";
import { fieldControlClass } from "./fieldStyles";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, rows = 4, ...props }, ref) => {
  return <textarea ref={ref} rows={rows} className={cn(fieldControlClass, "resize-y", className)} {...props} />;
});
Textarea.displayName = "Textarea";
