import { Card, Icon } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import type { MentorReadiness } from "@/types";

interface ChecklistItem {
  done: boolean;
  label: string;
}

/**
 * Every value here is the backend's own `MentorReadiness` — nothing is
 * recomputed client-side. `isBookable` (shown as the headline state) is the
 * same boolean the backend uses to decide Discover visibility.
 */
export function ReadinessChecklist({ readiness }: { readiness: MentorReadiness }) {
  const items: ChecklistItem[] = [
    { done: readiness.hasRequiredProfileInfo, label: "Add a headline and bio" },
    { done: readiness.hasTimezone, label: "Set your timezone" },
    { done: readiness.hasActiveOffering, label: "Create at least one active offering" },
    { done: readiness.hasActiveAvailabilityRule, label: "Add at least one active availability rule" },
    { done: readiness.acceptingBookings, label: "Turn on accepting bookings" },
  ];

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-serif text-lg font-semibold text-charcoal">
          {readiness.isBookable ? "You're bookable" : "Finish setting up"}
        </p>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-[11.5px] font-semibold",
            readiness.isBookable ? "bg-success-tint text-success" : "bg-ivory-sunken text-charcoal-faint",
          )}
        >
          <span aria-hidden="true" className={cn("h-[7px] w-[7px] rounded-full", readiness.isBookable ? "bg-success" : "bg-charcoal-faint")} />
          {readiness.isBookable ? "Bookable" : "Not yet bookable"}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] text-charcoal-muted">
        {readiness.isBookable
          ? "Customers can find and book you on Discover."
          : "Customers can't find or book you until every item below is done."}
      </p>

      <ul className="mt-4 flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2.5 text-[13.5px]">
            <span
              aria-hidden="true"
              className={cn(
                "flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-[length:var(--b-def)]",
                item.done ? "border-pine bg-pine text-ivory" : "border-line text-transparent",
              )}
            >
              <Icon name="check" className="h-2.5 w-2.5" />
            </span>
            <span className={item.done ? "text-charcoal-2 line-through decoration-line" : "text-charcoal-2"}>{item.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
