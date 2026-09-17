import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import type { MentorProfile } from "@prisma/client";

export async function getOwnMentorProfileOrThrow(userId: string): Promise<MentorProfile> {
  const profile = await prisma.mentorProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError(404, "MENTOR_PROFILE_NOT_FOUND", "Mentor profile not found.");
  }
  return profile;
}
