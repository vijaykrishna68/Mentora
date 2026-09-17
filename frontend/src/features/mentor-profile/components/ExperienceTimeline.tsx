import { formatMonthYear } from "@/lib/utils/datetime";
import type { PublicExperienceEntry } from "@/types";

interface ExperienceTimelineProps {
  entries: PublicExperienceEntry[];
}

/** Renders the backend's own ordering — never re-sorted or invented client-side. */
export function ExperienceTimeline({ entries }: ExperienceTimelineProps) {
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col">
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1;
        const dateRange = `${formatMonthYear(entry.startDate)} — ${entry.endDate ? formatMonthYear(entry.endDate) : "Present"}`;
        return (
          <div key={entry.id} className="grid grid-cols-[100px_20px_1fr] gap-0 pb-5 last:pb-0 sm:grid-cols-[120px_20px_1fr]">
            <p className="pt-0.5 text-[12.5px] text-charcoal-muted">{dateRange}</p>
            <div className="flex flex-col items-center">
              <span aria-hidden="true" className="mt-[5px] h-2 w-2 flex-none rounded-full bg-pine" />
              {!isLast && <span aria-hidden="true" className="mt-1 w-[1.5px] flex-1 bg-line" />}
            </div>
            <div>
              <p className="text-[14.5px] font-bold text-charcoal">{entry.role}</p>
              <p className="mt-0.5 text-[13px] text-charcoal-muted">{entry.organization}</p>
              {entry.description && <p className="mt-1.5 max-w-[58ch] text-[13.5px] text-charcoal-2">{entry.description}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
