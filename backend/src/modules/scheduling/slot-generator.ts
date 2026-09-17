import { Temporal } from "@js-temporal/polyfill";
import type { AvailabilityCategory } from "@prisma/client";

// ---------------------------------------------------------------------------
// This module is the single source of truth for scheduling correctness.
// It is pure (no DB access, no wall-clock reads) and deterministic given its
// inputs, so it is directly unit-testable and directly reusable by Phase 6
// booking validation — Phase 6 must call into this module rather than
// re-implementing any of these rules.
// ---------------------------------------------------------------------------

export interface AvailabilityRuleInput {
  startTime: Temporal.PlainTime;
  endTime: Temporal.PlainTime;
  /** Minutes of buffer this rule enforces around actual confirmed appointments. */
  bufferMinutes: number;
}

export interface ExistingAppointmentInput {
  startAt: Temporal.Instant;
  endAt: Temporal.Instant;
}

export interface OfferingInput {
  durationMinutes: number;
  availabilityCategories: AvailabilityCategory[];
}

export interface GenerateSlotsInput {
  /** The calendar date being requested, interpreted in `timezone`. */
  localDate: Temporal.PlainDate;
  /** Mentor's IANA timezone — the source of truth for all wall-clock times below. */
  timezone: string;
  /** Only the rules for this date's day-of-week, already filtered to isActive. */
  availabilityRules: AvailabilityRuleInput[];
  offering: OfferingInput;
  /** All of the mentor's CONFIRMED appointments that could plausibly overlap this date (any offering — a mentor can only run one session at a time). */
  existingAppointments: ExistingAppointmentInput[];
  /** Current instant — injected, never read from the system clock here, so generation is deterministic and testable. */
  now: Temporal.Instant;
  minimumNoticeMinutes: number;
  maximumAdvanceDays: number;
}

export interface GeneratedSlot {
  startAt: Temporal.Instant;
  endAt: Temporal.Instant;
  category: AvailabilityCategory;
}

// Time-of-day category boundaries. A start time outside [06:00, 23:00) has no
// category and is therefore never returned by any offering.
const CATEGORY_BOUNDARIES: ReadonlyArray<{
  category: AvailabilityCategory;
  start: Temporal.PlainTime;
  end: Temporal.PlainTime;
}> = [
  { category: "MORNING", start: Temporal.PlainTime.from("06:00"), end: Temporal.PlainTime.from("12:00") },
  { category: "AFTERNOON", start: Temporal.PlainTime.from("12:00"), end: Temporal.PlainTime.from("17:00") },
  { category: "EVENING", start: Temporal.PlainTime.from("17:00"), end: Temporal.PlainTime.from("23:00") },
];

// Derives a slot's time-of-day category strictly from its LOCAL START TIME —
// never from its end time or duration. A candidate that starts at 11:30 and
// runs into the afternoon is still MORNING; classification never shifts
// partway through a session.
export function deriveAvailabilityCategory(localStartTime: Temporal.PlainTime): AvailabilityCategory | null {
  for (const boundary of CATEGORY_BOUNDARIES) {
    if (
      Temporal.PlainTime.compare(localStartTime, boundary.start) >= 0 &&
      Temporal.PlainTime.compare(localStartTime, boundary.end) < 0
    ) {
      return boundary.category;
    }
  }
  return null;
}

// Half-open interval overlap: [startA, endA) vs [startB, endB). Adjacent
// intervals (one ends exactly when the other starts) do NOT overlap.
function instantsOverlap(
  startA: Temporal.Instant,
  endA: Temporal.Instant,
  startB: Temporal.Instant,
  endB: Temporal.Instant,
): boolean {
  return Temporal.Instant.compare(startA, endB) < 0 && Temporal.Instant.compare(startB, endA) < 0;
}

/**
 * Generates every bookable slot for one offering on one mentor-local calendar
 * date, already filtered for validity (fits its availability window, doesn't
 * conflict with an existing confirmed appointment plus buffer, matches an
 * allowed availability category, respects minimum notice / maximum advance,
 * and isn't in the past).
 *
 * Buffer interpretation (documented here so Phase 6 booking validation stays
 * consistent with this generator): buffer is never pre-reserved between
 * purely hypothetical candidates — a raw availability window of 09:00–12:00
 * with a 45-minute offering yields back-to-back candidates 09:00, 09:45,
 * 10:30, 11:15 regardless of bufferMinutes. Buffer only matters once a
 * session is actually CONFIRMED: an existing appointment's interval is
 * expanded by that rule's bufferMinutes on both sides before checking for
 * overlap against candidates, so a 10:00–10:45 appointment with a 15-minute
 * buffer blocks candidates until 11:00, not 10:45.
 */
export function generateSlots(input: GenerateSlotsInput): GeneratedSlot[] {
  const {
    localDate,
    timezone,
    availabilityRules,
    offering,
    existingAppointments,
    now,
    minimumNoticeMinutes,
    maximumAdvanceDays,
  } = input;

  const earliestAllowedInstant = now.add({ minutes: minimumNoticeMinutes });
  const latestAllowedInstant = now.add({ hours: maximumAdvanceDays * 24 });

  const slots: GeneratedSlot[] = [];

  for (const rule of availabilityRules) {
    const windowStart = localDate.toZonedDateTime({ timeZone: timezone, plainTime: rule.startTime });
    const windowEnd = localDate.toZonedDateTime({ timeZone: timezone, plainTime: rule.endTime });

    // Step by duration only — see buffer note above.
    let candidateStart = windowStart;

    while (true) {
      const candidateEnd = candidateStart.add({ minutes: offering.durationMinutes });
      if (Temporal.ZonedDateTime.compare(candidateEnd, windowEnd) > 0) {
        break;
      }

      const candidateStartInstant = candidateStart.toInstant();
      const candidateEndInstant = candidateEnd.toInstant();

      const category = deriveAvailabilityCategory(candidateStart.toPlainTime());
      const categoryAllowed = category !== null && offering.availabilityCategories.includes(category);

      const meetsMinimumNotice = Temporal.Instant.compare(candidateStartInstant, earliestAllowedInstant) >= 0;
      const withinMaximumAdvance = Temporal.Instant.compare(candidateStartInstant, latestAllowedInstant) <= 0;
      const isNotInThePast = Temporal.Instant.compare(candidateStartInstant, now) >= 0;

      const conflictsWithExisting = existingAppointments.some((appointment) => {
        const blockedStart = appointment.startAt.subtract({ minutes: rule.bufferMinutes });
        const blockedEnd = appointment.endAt.add({ minutes: rule.bufferMinutes });
        return instantsOverlap(candidateStartInstant, candidateEndInstant, blockedStart, blockedEnd);
      });

      if (categoryAllowed && meetsMinimumNotice && withinMaximumAdvance && isNotInThePast && !conflictsWithExisting) {
        slots.push({ startAt: candidateStartInstant, endAt: candidateEndInstant, category: category! });
      }

      candidateStart = candidateStart.add({ minutes: offering.durationMinutes });
    }
  }

  slots.sort((a, b) => Temporal.Instant.compare(a.startAt, b.startAt));
  return slots;
}
