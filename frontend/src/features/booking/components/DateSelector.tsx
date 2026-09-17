import { type KeyboardEvent, useMemo, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { formatDayOfMonth, formatWeekdayShort, getBrowserTimezone, toDateKey } from "@/lib/utils/datetime";

const DAYS_SHOWN = 14;

interface DateOption {
  key: string;
  weekday: string;
  day: string;
}

function buildDateOptions(timeZone: string): DateOption[] {
  const today = new Date();
  return Array.from({ length: DAYS_SHOWN }, (_, offset) => {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);
    return {
      key: toDateKey(date, timeZone),
      weekday: formatWeekdayShort(date, timeZone),
      day: formatDayOfMonth(date, timeZone),
    };
  });
}

interface DateSelectorProps {
  selectedDate: string | null;
  onSelectDate: (dateKey: string) => void;
}

/**
 * A compact 14-day strip in the customer's own calendar — not a full
 * calendar widget. There are no past dates to disable: the strip starts at
 * today by construction. The picked date is just a label passed to the
 * availability endpoint; the backend is what actually decides bookability.
 */
export function DateSelector({ selectedDate, onSelectDate }: DateSelectorProps) {
  const options = useMemo(() => buildDateOptions(getBrowserTimezone()), []);
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = options.findIndex((option) => option.key === selectedDate);
    const index = currentIndex === -1 ? 0 : currentIndex;

    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = Math.min(index + 1, options.length - 1);
    if (event.key === "ArrowLeft") nextIndex = Math.max(index - 1, 0);
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = options.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      const next = options[nextIndex];
      if (next) {
        onSelectDate(next.key);
        pillRefs.current[next.key]?.focus();
      }
    }
  }

  return (
    <div role="radiogroup" aria-label="Select a date" onKeyDown={handleKeyDown} className="flex gap-[7px] overflow-x-auto pb-1">
      {options.map((option) => {
        const selected = option.key === selectedDate;
        return (
          <button
            key={option.key}
            ref={(el) => {
              pillRefs.current[option.key] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (selectedDate === null && option === options[0]) ? 0 : -1}
            onClick={() => onSelectDate(option.key)}
            className={cn(
              "flex w-[52px] flex-none flex-col items-center rounded-sm border border-line bg-ivory py-2.5 transition-colors duration-[var(--dur-fast)]",
              selected && "border-pine bg-pine text-ivory",
            )}
          >
            <span className={cn("text-[10.5px] text-charcoal-muted", selected && "text-ivory/70")}>{option.weekday}</span>
            <span className="mt-0.5 font-bold">{option.day}</span>
          </button>
        );
      })}
    </div>
  );
}
