import { prisma } from "../../lib/prisma.js";
import { getOwnMentorProfileOrThrow } from "./mentor.util.js";
import { toMentorAppointmentListItemDTO } from "../appointments/appointment.dto.js";

// Classification/sort mirror the customer-side GET /api/appointments exactly
// (same getEffectiveAppointmentStatus rule, imported transitively via the
// DTO): upcoming = effective CONFIRMED, sorted ascending; past = effectively
// COMPLETED or CANCELLED, sorted descending.
export async function listMentorAppointments(userId: string) {
  const profile = await getOwnMentorProfileOrThrow(userId);

  const appointments = await prisma.appointment.findMany({
    where: { mentorProfileId: profile.id },
    include: {
      customer: { select: { name: true } },
      review: { select: { id: true, rating: true, comment: true, createdAt: true } },
    },
  });

  const upcoming: ReturnType<typeof toMentorAppointmentListItemDTO>[] = [];
  const past: ReturnType<typeof toMentorAppointmentListItemDTO>[] = [];

  for (const appointment of appointments) {
    const dto = toMentorAppointmentListItemDTO(appointment, {
      customerName: appointment.customer.name,
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
