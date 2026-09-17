import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "default" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-bold transition-[background,color,border-color,transform,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-editorial)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine active:scale-[0.98]";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-pine text-ivory hover:bg-pine-deep",
  secondary: "bg-ivory-raised text-charcoal border-[length:var(--b-def)] border-line hover:border-pine hover:text-pine",
  ghost: "bg-transparent text-charcoal underline decoration-line underline-offset-[3px] hover:decoration-charcoal px-1.5",
};

const sizes: Record<ButtonSize, string> = {
  default: "px-5 py-[11px] text-[13.5px]",
  sm: "px-3.5 py-2 text-[12.5px]",
};

/** Shared class builder so non-<button> elements (e.g. a <Link> styled as a button) stay visually identical to Button. */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "default", className?: string): string {
  return cn(base, variants[variant], variant !== "ghost" && sizes[size], className);
}
