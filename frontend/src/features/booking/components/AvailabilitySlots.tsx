import { Button, EmptyState, ErrorState, Mark, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { formatTime, getBrowserTimezone } from "@/lib/utils/datetime";
import type { AvailabilityCategory, AvailabilitySlot } from "@/types";

const CATEGORY_ORDER: AvailabilityCategory[] = ["MORNING", "AFTERNOON", "EVENING"];
const CATEGORY_LABELS: Record<AvailabilityCategory, string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
};

function groupByCategory(slots: AvailabilitySlot[]): Array<[AvailabilityCategory, AvailabilitySlot[]]> {
  const groups = new Map<AvailabilityCategory, AvailabilitySlot[]>();
  for (const slot of slots) {
    const group = groups.get(slot.category);
    if (group) group.push(slot);
    else groups.set(slot.category, [slot]);
  }
  return CATEGORY_ORDER.filter((category) => groups.has(category)).map((category) => [category, groups.get(category)!]);
}

interface AvailabilitySlotsProps {
  slots: AvailabilitySlot[];
  isPending: boolean;
  isError: boolean;
  errorMessage: string | null;
  durationMinutes: number;
  selectedSlot: AvailabilitySlot | null;
  onSelectSlot: (slot: AvailabilitySlot) => void;
  onTryAnotherDate: () => void;
  onRetry: () => void;
}

/**
 * Purely presentational — the parent (BookingPanel) owns the availability
 * query so it can also read the resolved mentor timezone for the review
 * dialog. Renders exactly what GET /availability returned, grouped by the
 * category the backend already computed per slot — never a frontend guess
 * at eligibility.
 */
export function AvailabilitySlots({
  slots,
  isPending,
  isError,
  errorMessage,
  durationMinutes,
  selectedSlot,
  onSelectSlot,
  onTryAnotherDate,
  onRetry,
}: AvailabilitySlotsProps) {
  const customerTimezone = getBrowserTimezone();

  if (isPending) {
    return (
      <div className="mt-4 grid grid-cols-3 gap-2" aria-busy="true" aria-label="Loading availability">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-4">
        <ErrorState title="Couldn't load availability" description={errorMessage ?? "Something went wrong. Please try again."} onRetry={onRetry} />
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState
          title="No sessions available for this date."
          action={
            <Button variant="secondary" size="sm" onClick={onTryAnotherDate}>
              Try another date
            </Button>
          }
        />
      </div>
    );
  }

  const groups = groupByCategory(slots);

  return (
    <div className="mt-4 flex flex-col gap-4">
      {groups.map(([category, categorySlots]) => (
        <div key={category}>
          <p className="text-xs font-bold uppercase tracking-[0.04em] text-charcoal-muted">{CATEGORY_LABELS[category]}</p>
          <div role="radiogroup" aria-label={`${CATEGORY_LABELS[category]} times`} className="mt-2 grid grid-cols-3 gap-2">
            {categorySlots.map((slot) => {
              const selected = selectedSlot?.startAt === slot.startAt;
              return (
                <button
                  key={slot.startAt}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onSelectSlot(slot)}
                  className={cn(
                    "flex flex-col items-center rounded-sm border border-line bg-ivory px-1 py-2.5 text-center transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-editorial)]",
                    selected && "border-pine bg-ivory-raised shadow-sm",
                  )}
                >
                  <span className={cn("text-[12.5px] font-semibold", selected && "text-pine")}>
                    {formatTime(slot.startAt, customerTimezone)}
                  </span>
                  <span className="mt-0.5 text-[10px] text-charcoal-faint">{durationMinutes} min</span>
                  <Mark active={selected} className="mt-1.5" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
