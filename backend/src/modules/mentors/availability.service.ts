import { Temporal } from "@js-temporal/polyfill";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { getSlotsForDate } from "../scheduling/availability-resolver.js";

export interface GetPublicAvailabilityInput {
  mentorId: string;
  offeringId: string;
  date: string; // YYYY-MM-DD
}

export interface PublicAvailabilityResponse {
  mentorId: string;
  offeringId: string;
  date: string;
  timezone: string | null;
  slots: Array<{ startAt: string; endAt: string; category: string }>;
}

function emptyResponse(input: GetPublicAvailabilityInput, timezone: string | null): PublicAvailabilityResponse {
  return { mentorId: input.mentorId, offeringId: input.offeringId, date: input.date, timezone, slots: [] };
}

// Checks, in order (see Phase 4 spec):
//   1-2. mentor/mentor-profile exists  — a MentorProfile IS the public
//        "mentor" entity in this schema (every MENTOR user gets exactly one,
//        created atomically at registration), so these collapse into a
//        single lookup by MentorProfile.id.
//   3-4. mentor is bookable (acceptingBookings + onboardingComplete) — not
//        an error state, just an empty result, so a currently-unbookable
//        mentor doesn't leak *why* via a 4xx.
//   5-7. offering exists, belongs to this mentor, and is active.
export async function getPublicAvailability(input: GetPublicAvailabilityInput): Promise<PublicAvailabilityResponse> {
  const mentorProfile = await prisma.mentorProfile.findUnique({ where: { id: input.mentorId } });
  if (!mentorProfile) {
    throw new AppError(404, "MENTOR_NOT_FOUND", "Mentor not found.");
  }

  if (!mentorProfile.acceptingBookings || !mentorProfile.onboardingComplete) {
    return emptyResponse(input, mentorProfile.timezone);
  }

  const offering = await prisma.offering.findUnique({ where: { id: input.offeringId } });
  if (!offering || offering.mentorProfileId !== mentorProfile.id) {
    throw new AppError(404, "OFFERING_NOT_FOUND", "Offering not found.");
  }
  if (!offering.isActive) {
    throw new AppError(409, "OFFERING_INACTIVE", "This offering is no longer available.");
  }

  // onboardingComplete implies hasTimezone (see mentor.readiness.ts), so this
  // is always set once we reach this point.
  const timezone = mentorProfile.timezone as string;
  const localDate = Temporal.PlainDate.from(input.date);

  const slots = await getSlotsForDate({ mentorProfile, offering, localDate });

  return {
    mentorId: mentorProfile.id,
    offeringId: offering.id,
    date: input.date,
    timezone,
    slots: slots.map((slot) => ({
      startAt: new Date(slot.startAt.epochMilliseconds).toISOString(),
      endAt: new Date(slot.endAt.epochMilliseconds).toISOString(),
      category: slot.category,
    })),
  };
}
