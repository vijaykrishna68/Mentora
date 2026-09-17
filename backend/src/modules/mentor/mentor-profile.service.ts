import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { getOwnMentorProfileOrThrow } from "./mentor.util.js";
import { getMentorReadiness, syncOnboardingComplete } from "./mentor.readiness.js";
import { toPrivateMentorProfileDTO } from "./mentor.dto.js";
import type { UpdateMentorProfileInput } from "./mentor-profile.schema.js";

export async function getMyProfile(userId: string) {
  const profile = await getOwnMentorProfileOrThrow(userId);
  const [readiness, experienceEntries] = await Promise.all([
    getMentorReadiness(profile.id),
    prisma.experienceEntry.findMany({
      where: { mentorProfileId: profile.id },
      orderBy: { order: "asc" },
    }),
  ]);
  return { profile: toPrivateMentorProfileDTO(profile), readiness, experienceEntries };
}

export async function updateMyProfile(userId: string, input: UpdateMentorProfileInput) {
  const existing = await getOwnMentorProfileOrThrow(userId);

  if (input.acceptingBookings === true) {
    const readiness = await getMentorReadiness(existing.id);
    if (!readiness.readyExcludingAcceptingBookings) {
      const blockingReasons = readiness.reasons.filter((r) => r !== "Turn on accepting bookings.");
      throw new AppError(
        400,
        "ONBOARDING_INCOMPLETE",
        `Cannot enable accepting bookings yet: ${blockingReasons.join(" ")}`,
      );
    }
  }

  await prisma.mentorProfile.update({ where: { id: existing.id }, data: input });
  const { readiness, profile } = await syncOnboardingComplete(existing.id);
  return { profile: toPrivateMentorProfileDTO(profile), readiness };
}
