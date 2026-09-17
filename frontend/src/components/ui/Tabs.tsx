import { type KeyboardEvent, useRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}

/** Segmented control (mockup's `.seg-tabs`) — roving-tabindex keyboard nav per WAI-ARIA tabs pattern. */
export function Tabs({ items, value, onChange, label, className }: TabsProps) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = items.findIndex((item) => item.value === value);
    if (index === -1) return;

    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % items.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + items.length) % items.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      const next = items[nextIndex];
      if (next) {
        onChange(next.value);
        tabRefs.current[next.value]?.focus();
      }
    }
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn("inline-flex gap-1 rounded-sm border-[length:var(--b-hair)] border-line p-0.5", className)}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              tabRefs.current[item.value] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              "rounded-[calc(var(--radius-sm)-2px)] px-3.5 py-1.5 text-xs font-semibold transition-colors duration-[var(--dur-fast)]",
              selected ? "bg-pine text-ivory" : "text-charcoal-muted hover:text-charcoal",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
