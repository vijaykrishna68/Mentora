import { Temporal } from "@js-temporal/polyfill";
import type { MentorProfile, Offering } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { generateSlots, type GeneratedSlot } from "./slot-generator.js";
import { dbTimeToPlainTime, isoDayOfWeekToDayOfWeek, dateToInstant } from "./time-conversion.js";

// ---------------------------------------------------------------------------
// The single place that loads DB state and calls the pure generator. Both
// the public availability endpoint (Phase 4) and booking validation
// (Phase 5) call this — neither re-implements any scheduling rule itself.
// ---------------------------------------------------------------------------

export interface GetSlotsForDateInput {
  /** Must have a non-null timezone — callers are expected to have already checked mentor readiness. */
  mentorProfile: Pick<MentorProfile, "id" | "timezone" | "minimumNoticeMinutes" | "maximumAdvanceDays">;
  offering: Pick<Offering, "durationMinutes" | "availabilityCategories">;
  localDate: Temporal.PlainDate;
  /** Diagnostic use only (see evaluateRequestedSlot) — pretends no appointments exist. */
  ignoreExistingAppointments?: boolean;
}

export async function getSlotsForDate(input: GetSlotsForDateInput): Promise<GeneratedSlot[]> {
  const { mentorProfile, offering, localDate } = input;
  const timezone = mentorProfile.timezone;
  if (!timezone) {
    throw new Error("Cannot generate slots for a mentor with no timezone configured.");
  }

  const dayOfWeek = isoDayOfWeekToDayOfWeek(localDate.dayOfWeek);
  const rules = await prisma.availabilityRule.findMany({
    where: { mentorProfileId: mentorProfile.id, dayOfWeek, isActive: true },
  });

  if (rules.length === 0) {
    return [];
  }

  let existingAppointments: Array<{ startAt: Temporal.Instant; endAt: Temporal.Instant }> = [];

  if (!input.ignoreExistingAppointments) {
    // Generous fixed margin around the requested local date rather than an
    // exact bound — correctness comes from the generator's own overlap
    // check, this just keeps the query cheap.
    const dayStart = localDate.toZonedDateTime({ timeZone: timezone, plainTime: "00:00" }).toInstant();
    const dayEnd = localDate.add({ days: 1 }).toZonedDateTime({ timeZone: timezone, plainTime: "00:00" }).toInstant();
    const margin = Temporal.Duration.from({ hours: 24 });

    const rows = await prisma.appointment.findMany({
      where: {
        mentorProfileId: mentorProfile.id,
        status: "CONFIRMED",
        startAt: { lt: new Date(dayEnd.add(margin).epochMilliseconds) },
        endAt: { gt: new Date(dayStart.subtract(margin).epochMilliseconds) },
      },
      select: { startAt: true, endAt: true },
    });
    existingAppointments = rows.map((row) => ({ startAt: dateToInstant(row.startAt), endAt: dateToInstant(row.endAt) }));
  }

  const now = Temporal.Now.instant();

  return generateSlots({
    localDate,
    timezone,
    availabilityRules: rules.map((rule) => ({
      startTime: dbTimeToPlainTime(rule.startTime),
      endTime: dbTimeToPlainTime(rule.endTime),
      bufferMinutes: rule.bufferMinutes,
    })),
    offering: { durationMinutes: offering.durationMinutes, availabilityCategories: offering.availabilityCategories },
    existingAppointments,
    now,
    minimumNoticeMinutes: mentorProfile.minimumNoticeMinutes,
    maximumAdvanceDays: mentorProfile.maximumAdvanceDays,
  });
}

export interface SlotEvaluation {
  valid: boolean;
  slot?: GeneratedSlot;
  /** True when the ONLY reason this candidate isn't currently valid is a conflicting existing appointment — i.e. it was legitimate until something else took it. */
  conflictOnly: boolean;
}

// Used by booking (Phase 5) to check one specific requested startAt against
// exactly the same rules the availability endpoint uses. If it's not valid,
// distinguishes "someone already booked this" (conflictOnly) from every
// other reason (outside window, wrong category, notice/advance/past) so the
// booking service can return the right error code.
export async function evaluateRequestedSlot(params: {
  mentorProfile: GetSlotsForDateInput["mentorProfile"];
  offering: GetSlotsForDateInput["offering"];
  requestedStart: Temporal.Instant;
  timezone: string;
}): Promise<SlotEvaluation> {
  const localDate = params.requestedStart.toZonedDateTimeISO(params.timezone).toPlainDate();

  const slots = await getSlotsForDate({ mentorProfile: params.mentorProfile, offering: params.offering, localDate });
  const match = slots.find((slot) => Temporal.Instant.compare(slot.startAt, params.requestedStart) === 0);
  if (match) {
    return { valid: true, slot: match, conflictOnly: false };
  }

  const slotsIgnoringConflicts = await getSlotsForDate({
    mentorProfile: params.mentorProfile,
    offering: params.offering,
    localDate,
    ignoreExistingAppointments: true,
  });
  const wouldHaveMatched = slotsIgnoringConflicts.some(
    (slot) => Temporal.Instant.compare(slot.startAt, params.requestedStart) === 0,
  );

  return { valid: false, conflictOnly: wouldHaveMatched };
}
