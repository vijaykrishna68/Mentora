import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { getEffectiveAppointmentStatus } from "./appointment-status.js";
import { toReviewDTO } from "./review.dto.js";
import type { CreateReviewInput } from "./review.schema.js";

function isDuplicateReviewViolation(error: unknown): boolean {
  // Review.appointmentId is @unique — Prisma has first-class support for
  // detecting this (unlike the exclusion-constraint case in bookings), so a
  // typed P2002 check is reliable here.
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) &&
    (error.meta.target as string[]).includes("appointmentId")
  );
}

// Eligibility (checks 1-5 from the Phase 6 spec):
//   1-2. appointment exists and is owned by this customer.
//   3-4. effectively COMPLETED, and explicitly not CANCELLED (a cancelled
//        appointment's endAt may also be in the past, but it must never
//        read as "completed" for review purposes).
//   5.   one review per appointment — enforced authoritatively by the DB
//        unique constraint (see isDuplicateReviewViolation), not merely by
//        a check-then-insert.
export async function createReview(customerId: string, appointmentId: string, input: CreateReviewInput) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) {
    throw new AppError(404, "APPOINTMENT_NOT_FOUND", "Appointment not found.");
  }
  if (appointment.customerId !== customerId) {
    throw new AppError(403, "FORBIDDEN", "You do not own this appointment.");
  }

  const effectiveStatus = getEffectiveAppointmentStatus(appointment);
  if (effectiveStatus === "CANCELLED") {
    throw new AppError(409, "APPOINTMENT_CANCELLED", "Cancelled appointments cannot be reviewed.");
  }
  if (effectiveStatus !== "COMPLETED") {
    throw new AppError(409, "APPOINTMENT_NOT_COMPLETED", "This appointment hasn't been completed yet.");
  }

  try {
    const review = await prisma.review.create({
      data: {
        appointmentId,
        customerId,
        mentorProfileId: appointment.mentorProfileId,
        rating: input.rating,
        comment: input.comment ?? null,
      },
      include: { customer: { select: { name: true } } },
    });
    return toReviewDTO(review, { customerDisplayName: review.customer.name });
  } catch (error) {
    if (isDuplicateReviewViolation(error)) {
      throw new AppError(409, "REVIEW_ALREADY_EXISTS", "This appointment has already been reviewed.");
    }
    throw error;
  }
}
