import type { Appointment, AppointmentStatus } from "@prisma/client";

export type EffectiveAppointmentStatus = AppointmentStatus | "COMPLETED";

// Persisted statuses are only CONFIRMED/CANCELLED — there is no scheduler,
// cron, or queue that ever writes COMPLETED. A CONFIRMED appointment whose
// endAt has already passed is effectively COMPLETED, computed here at read
// time. Reviews and any future appointments-listing endpoint must call this
// rather than re-deriving the rule themselves.
export function getEffectiveAppointmentStatus(
  appointment: Pick<Appointment, "status" | "endAt">,
  now: Date = new Date(),
): EffectiveAppointmentStatus {
  if (appointment.status === "CONFIRMED" && appointment.endAt.getTime() < now.getTime()) {
    return "COMPLETED";
  }
  return appointment.status;
}
