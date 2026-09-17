import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { toPublicMentorProfileDTO } from "../mentor/mentor.dto.js";
import { getMentorRatingSummary, getMentorCompletedSessionCount } from "../mentor/mentor-rating.js";
import { PUBLIC_OFFERING_SELECT, toPublicOfferingDTO } from "./public-offering.js";

function toPublicExperienceDTO(entry: {
  id: string;
  organization: string;
  role: string;
  startDate: Date;
  endDate: Date | null;
  description: string | null;
  order: number;
}) {
  return {
    id: entry.id,
    organization: entry.organization,
    role: entry.role,
    startDate: entry.startDate.toISOString(),
    endDate: entry.endDate?.toISOString() ?? null,
    description: entry.description,
    order: entry.order,
  };
}

// 404 means "no such mentorId" only. A mentor that exists but isn't
// currently bookable (incomplete profile, no active offering, acceptingBookings
// off, ...) still gets a normal 200 with their public data — the same
// philosophy Phase 4 already applied to the availability endpoint (a
// not-bookable mentor there gets an empty slot list, not an error). Booking
// itself independently enforces bookability (Phase 5: MENTOR_NOT_ACCEPTING_
// BOOKINGS / MENTOR_NOT_READY), so nothing here needs to duplicate that gate.
export async function getPublicMentorProfile(mentorId: string) {
  const mentor = await prisma.mentorProfile.findUnique({
    where: { id: mentorId },
    include: {
      user: { select: { name: true } },
      offerings: { where: { isActive: true }, select: PUBLIC_OFFERING_SELECT },
      experienceEntries: { orderBy: { order: "asc" } },
    },
  });

  if (!mentor) {
    throw new AppError(404, "MENTOR_NOT_FOUND", "Mentor not found.");
  }

  const [ratingSummary, completedSessionCount] = await Promise.all([
    getMentorRatingSummary(mentor.id),
    getMentorCompletedSessionCount(mentor.id),
  ]);

  return {
    ...toPublicMentorProfileDTO(mentor, mentor.user.name, { ...ratingSummary, completedSessionCount }),
    offerings: mentor.offerings.map(toPublicOfferingDTO),
    experienceEntries: mentor.experienceEntries.map(toPublicExperienceDTO),
  };
}
