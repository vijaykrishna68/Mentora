import { Temporal } from "@js-temporal/polyfill";
import type { DayOfWeek } from "@prisma/client";

// AvailabilityRule.startTime/endTime are @db.Time, which Prisma represents
// as a Date anchored at 1970-01-01 UTC — only the time-of-day component
// (read via the UTC getters) is meaningful.
export function dbTimeToPlainTime(value: Date): Temporal.PlainTime {
  return Temporal.PlainTime.from({
    hour: value.getUTCHours(),
    minute: value.getUTCMinutes(),
    second: value.getUTCSeconds(),
  });
}

const DAY_OF_WEEK_BY_ISO: Record<number, DayOfWeek> = {
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
  7: "SUNDAY",
};

// Temporal.PlainDate.dayOfWeek is ISO (1=Monday..7=Sunday), matching the
// declaration order of the Prisma DayOfWeek enum.
export function isoDayOfWeekToDayOfWeek(isoDayOfWeek: number): DayOfWeek {
  const day = DAY_OF_WEEK_BY_ISO[isoDayOfWeek];
  if (!day) {
    throw new Error(`Invalid ISO day-of-week: ${isoDayOfWeek}`);
  }
  return day;
}

export function instantToDate(instant: Temporal.Instant): Date {
  return new Date(instant.epochMilliseconds);
}

export function dateToInstant(date: Date): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(date.getTime());
}
