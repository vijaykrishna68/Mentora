import { Badge, Button } from "@/components/ui";
import { DAYS_OF_WEEK, DAY_OF_WEEK_LABELS, type AvailabilityRule, type DayOfWeek } from "@/types";

interface WeeklyScheduleViewProps {
  rules: AvailabilityRule[];
  onAddForDay: (day: DayOfWeek) => void;
  onEdit: (rule: AvailabilityRule) => void;
  onDelete: (rule: AvailabilityRule) => void;
}

/**
 * Groups the backend's own rows by day for display — the rows themselves,
 * their order within a day, and every value shown come straight from the
 * backend (already sorted dayOfWeek asc, startTime asc). No slot generation,
 * overlap checking, or buffer math happens here.
 */
export function WeeklyScheduleView({ rules, onAddForDay, onEdit, onDelete }: WeeklyScheduleViewProps) {
  return (
    <div className="flex flex-col divide-y divide-line rounded-md border-[length:var(--b-hair)] border-line bg-ivory-raised">
      {DAYS_OF_WEEK.map((day) => {
        const dayRules = rules.filter((rule) => rule.dayOfWeek === day);
        return (
          <div key={day} className="flex flex-col gap-2.5 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <p className="w-28 flex-none pt-1 text-sm font-bold text-charcoal">{DAY_OF_WEEK_LABELS[day]}</p>

            <div className="flex-1">
              {dayRules.length === 0 ? (
                <p className="pt-1 text-[13px] text-charcoal-faint">No availability</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {dayRules.map((rule) => (
                    <li
                      key={rule.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-line bg-ivory px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span className="font-semibold tabular-nums text-charcoal">
                          {rule.startTime} — {rule.endTime}
                        </span>
                        {rule.bufferMinutes > 0 && <span className="text-charcoal-muted">{rule.bufferMinutes} min buffer</span>}
                        <Badge variant={rule.isActive ? "success" : "neutral"}>{rule.isActive ? "Active" : "Inactive"}</Badge>
                      </div>
                      <div className="flex gap-1.5">
                        <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(rule)}>
                          Edit
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(rule)}>
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Button type="button" variant="secondary" size="sm" className="flex-none" onClick={() => onAddForDay(day)}>
              Add
            </Button>
          </div>
        );
      })}
    </div>
  );
}
