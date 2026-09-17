import { Temporal } from "@js-temporal/polyfill";
import type { Appointment } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { evaluateRequestedSlot } from "../scheduling/availability-resolver.js";
import { getEffectiveAppointmentStatus } from "./appointment-status.js";
import { toAppointmentDTO, toCustomerAppointmentListItemDTO } from "./appointment.dto.js";
import { isBookingConflictError } from "./exclusion-constraint.js";
import type { CreateAppointmentInput } from "./appointment.schema.js";

const CANCELLATION_DEADLINE_HOURS = 24;

// Validation order mirrors the Phase 5 spec exactly (checks 1-11). Checks
// 1-9 are structural/state checks against the mentor and offering; check 11
// (the actual candidate) reuses evaluateRequestedSlot, which itself reuses
// the exact same getSlotsForDate/generateSlots pipeline as GET availability
// (Phase 4) — there is no second implementation of scheduling rules here.
export async function createAppointment(customerId: string, input: CreateAppointmentInput) {
  const mentorProfile = await prisma.mentorProfile.findUnique({ where: { id: input.mentorId } });
  if (!mentorProfile) {
    throw new AppError(404, "MENTOR_NOT_FOUND", "Mentor not found.");
  }

  if (!mentorProfile.acceptingBookings) {
    throw new AppError(409, "MENTOR_NOT_ACCEPTING_BOOKINGS", "This mentor is not currently accepting bookings.");
  }
  if (!mentorProfile.onboardingComplete) {
    throw new AppError(409, "MENTOR_NOT_READY", "This mentor has not completed onboarding yet.");
  }

  const offering = await prisma.offering.findUnique({ where: { id: input.offeringId } });
  if (!offering || offering.mentorProfileId !== mentorProfile.id) {
    throw new AppError(404, "OFFERING_NOT_FOUND", "Offering not found.");
  }
  if (!offering.isActive) {
    throw new AppError(409, "OFFERING_INACTIVE", "This offering is no longer available.");
  }

  if (!offering.connectionModes.includes(input.connectionMode)) {
    throw new AppError(
      400,
      "UNSUPPORTED_CONNECTION_MODE",
      "This offering does not support the requested connection mode.",
    );
  }
  if (!mentorProfile.connectionModes.includes(input.connectionMode)) {
    throw new AppError(
      400,
      "UNSUPPORTED_CONNECTION_MODE",
      "This mentor does not support the requested connection mode.",
    );
  }

  let requestedStart: Temporal.Instant;
  try {
    requestedStart = Temporal.Instant.from(input.startAt);
  } catch {
    throw new AppError(400, "INVALID_START_AT", "startAt must be a valid ISO 8601 UTC instant.");
  }

  // onboardingComplete implies hasTimezone (see mentor.readiness.ts).
  const timezone = mentorProfile.timezone as string;

  const evaluation = await evaluateRequestedSlot({ mentorProfile, offering, requestedStart, timezone });
  if (!evaluation.valid) {
    if (evaluation.conflictOnly) {
      // Caught by our own pre-check rather than the DB constraint below —
      // same underlying situation (someone already holds this slot), same code.
      throw new AppError(409, "SLOT_UNAVAILABLE", "That slot was just booked.");
    }
    throw new AppError(400, "INVALID_SLOT", "The requested time is not a currently bookable slot.");
  }

  const endInstant = evaluation.slot!.endAt; // authoritative — derived from offering.durationMinutes, never from the client

  const offeringSnapshot = {
    name: offering.name,
    durationMinutes: offering.durationMinutes,
    price: Number(offering.price),
    currency: offering.currency,
  };

  const connectionDetail = input.connectionMode === "PHONE" ? (mentorProfile.phone ?? null) : null;

  let appointment: Appointment;
  try {
    // Single-statement transaction: the actual concurrency guarantee comes
    // from the DB exclusion constraint checked atomically during this
    // INSERT, not from wrapping it in $transaction — but the boundary is
    // made explicit here, kept short, and does nothing but this insert.
    appointment = await prisma.$transaction(async (tx) => {
      return tx.appointment.create({
        data: {
          customerId,
          mentorProfileId: mentorProfile.id,
          offeringId: offering.id,
          startAt: new Date(requestedStart.epochMilliseconds),
          endAt: new Date(endInstant.epochMilliseconds),
          status: "CONFIRMED",
          connectionMode: input.connectionMode,
          mentorTimezone: timezone,
          connectionDetail,
          offeringSnapshot,
        },
      });
    });
  } catch (error) {
    if (isBookingConflictError(error)) {
      throw new AppError(409, "SLOT_UNAVAILABLE", "That slot was just booked.");
    }
    throw error;
  }

  return toAppointmentDTO(appointment);
}

export async function cancelAppointment(customerId: string, appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) {
    throw new AppError(404, "APPOINTMENT_NOT_FOUND", "Appointment not found.");
  }
  if (appointment.customerId !== customerId) {
    throw new AppError(403, "FORBIDDEN", "You do not own this appointment.");
  }

  const effectiveStatus = getEffectiveAppointmentStatus(appointment);
  if (effectiveStatus === "CANCELLED") {
    throw new AppError(409, "APPOINTMENT_ALREADY_CANCELLED", "This appointment has already been cancelled.");
  }
  if (effectiveStatus === "COMPLETED") {
    throw new AppError(
      409,
      "APPOINTMENT_ALREADY_COMPLETED",
      "This appointment has already been completed and can no longer be cancelled.",
    );
  }

  // now < startAt - 24h
  const deadline = new Date(appointment.startAt.getTime() - CANCELLATION_DEADLINE_HOURS * 60 * 60 * 1000);
  if (Date.now() >= deadline.getTime()) {
    throw new AppError(
      409,
      "CANCELLATION_DEADLINE_PASSED",
      "Cancellation is only allowed until 24 hours before the appointment start.",
    );
  }

  const cancelled = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CANCELLED" },
  });

  return toAppointmentDTO(cancelled);
}

// Classification (documented here as the single source of truth):
//   Upcoming — effective status CONFIRMED (i.e. persisted CONFIRMED and
//     endAt hasn't passed yet).
//   Past — everything else: effectively COMPLETED (persisted CONFIRMED,
//     endAt has passed) OR CANCELLED.
// Sorted upcoming ascending (soonest first), past descending (most recent
// first) — the natural reading order for each list.
export async function listMyAppointments(customerId: string) {
  const appointments = await prisma.appointment.findMany({
    where: { customerId },
    include: {
      mentorProfile: { select: { avatarUrl: true, user: { select: { name: true } } } },
      review: { select: { id: true, rating: true, comment: true, createdAt: true } },
    },
  });

  const upcoming: ReturnType<typeof toCustomerAppointmentListItemDTO>[] = [];
  const past: ReturnType<typeof toCustomerAppointmentListItemDTO>[] = [];

  for (const appointment of appointments) {
    const dto = toCustomerAppointmentListItemDTO(appointment, {
      mentorName: appointment.mentorProfile.user.name,
      mentorAvatarUrl: appointment.mentorProfile.avatarUrl,
      review: appointment.review,
    });
    if (dto.status === "CONFIRMED") {
      upcoming.push(dto);
    } else {
      past.push(dto);
    }
  }

  upcoming.sort((a, b) => a.startAt.localeCompare(b.startAt));
  past.sort((a, b) => b.startAt.localeCompare(a.startAt));

  return { upcoming, past };
}
