import type { Appointment, Review } from "@prisma/client";
import { getEffectiveAppointmentStatus } from "./appointment-status.js";

// The customer-facing status always reflects the EFFECTIVE status (including
// derived COMPLETED), never the raw persisted enum.
export function toAppointmentDTO(appointment: Appointment) {
  return {
    id: appointment.id,
    mentorId: appointment.mentorProfileId,
    offeringId: appointment.offeringId,
    customerId: appointment.customerId,
    startAt: appointment.startAt.toISOString(),
    endAt: appointment.endAt.toISOString(),
    status: getEffectiveAppointmentStatus(appointment),
    connectionMode: appointment.connectionMode,
    connectionDetail: appointment.connectionDetail,
    mentorTimezone: appointment.mentorTimezone,
    offeringSnapshot: appointment.offeringSnapshot,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
  };
}

export interface CustomerAppointmentListContext {
  mentorName: string;
  mentorAvatarUrl: string | null;
  review: Pick<Review, "id" | "rating" | "comment" | "createdAt"> | null;
}

// Richer shape for GET /api/appointments (Phase 6) — the customer's own list
// needs mentor display info and review state that the plain booking/cancel
// response (toAppointmentDTO above) doesn't. Kept as a separate function so
// Phase 5's existing response contract is untouched.
export function toCustomerAppointmentListItemDTO(appointment: Appointment, context: CustomerAppointmentListContext) {
  const effectiveStatus = getEffectiveAppointmentStatus(appointment);
  return {
    id: appointment.id,
    mentor: {
      id: appointment.mentorProfileId,
      name: context.mentorName,
      avatarUrl: context.mentorAvatarUrl,
    },
    offeringId: appointment.offeringId,
    // UTC instants — the frontend converts to the viewer's own local time.
    // mentorTimezone is the booking-time snapshot for showing "mentor's time".
    startAt: appointment.startAt.toISOString(),
    endAt: appointment.endAt.toISOString(),
    mentorTimezone: appointment.mentorTimezone,
    connectionMode: appointment.connectionMode,
    connectionDetail: appointment.connectionDetail,
    offeringSnapshot: appointment.offeringSnapshot,
    status: effectiveStatus,
    canReview: effectiveStatus === "COMPLETED" && !context.review,
    review: context.review
      ? {
          id: context.review.id,
          rating: context.review.rating,
          comment: context.review.comment,
          createdAt: context.review.createdAt.toISOString(),
        }
      : null,
    createdAt: appointment.createdAt.toISOString(),
  };
}

export interface MentorAppointmentListContext {
  customerName: string;
  review: Pick<Review, "id" | "rating" | "comment" | "createdAt"> | null;
}

// Mirrors toCustomerAppointmentListItemDTO above but from the mentor's side
// of the same appointment: customer identity instead of mentor identity, no
// canReview (that's a customer-only action). Kept separate rather than
// parameterizing one function for both directions, since the two "other
// party" shapes are genuinely different (mentor: id/name/avatarUrl; customer:
// id/name only, per the mentor-appointments spec) — reuse is in the shared
// getEffectiveAppointmentStatus/snapshot fields, not in a forced-generic DTO.
export function toMentorAppointmentListItemDTO(appointment: Appointment, context: MentorAppointmentListContext) {
  return {
    id: appointment.id,
    customer: {
      id: appointment.customerId,
      name: context.customerName,
    },
    offeringId: appointment.offeringId,
    startAt: appointment.startAt.toISOString(),
    endAt: appointment.endAt.toISOString(),
    mentorTimezone: appointment.mentorTimezone,
    connectionMode: appointment.connectionMode,
    connectionDetail: appointment.connectionDetail,
    offeringSnapshot: appointment.offeringSnapshot,
    status: getEffectiveAppointmentStatus(appointment),
    review: context.review
      ? {
          id: context.review.id,
          rating: context.review.rating,
          comment: context.review.comment,
          createdAt: context.review.createdAt.toISOString(),
        }
      : null,
    createdAt: appointment.createdAt.toISOString(),
  };
}
