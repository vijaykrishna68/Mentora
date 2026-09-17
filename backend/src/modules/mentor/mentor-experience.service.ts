import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { getOwnMentorProfileOrThrow } from "./mentor.util.js";
import type { CreateExperienceInput, UpdateExperienceInput } from "./mentor-experience.schema.js";

async function getOwnedExperienceOrThrow(userId: string, experienceId: string) {
  const entry = await prisma.experienceEntry.findUnique({
    where: { id: experienceId },
    include: { mentorProfile: { select: { userId: true } } },
  });
  if (!entry) {
    throw new AppError(404, "EXPERIENCE_NOT_FOUND", "Experience entry not found.");
  }
  if (entry.mentorProfile.userId !== userId) {
    throw new AppError(403, "FORBIDDEN", "You do not own this experience entry.");
  }
  return entry;
}

function assertValidDateRange(startDate: Date, endDate: Date | null | undefined): void {
  if (endDate && endDate < startDate) {
    throw new AppError(400, "INVALID_DATE_RANGE", "endDate cannot precede startDate.");
  }
}

export async function createExperience(userId: string, input: CreateExperienceInput) {
  const profile = await getOwnMentorProfileOrThrow(userId);
  assertValidDateRange(input.startDate, input.endDate);

  let order = input.order;
  if (order === undefined) {
    const last = await prisma.experienceEntry.findFirst({
      where: { mentorProfileId: profile.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    order = (last?.order ?? -1) + 1;
  }

  return prisma.experienceEntry.create({
    data: {
      mentorProfileId: profile.id,
      organization: input.organization,
      role: input.role,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      description: input.description ?? null,
      order,
    },
  });
}

export async function updateExperience(userId: string, experienceId: string, input: UpdateExperienceInput) {
  const existing = await getOwnedExperienceOrThrow(userId, experienceId);

  const effectiveStart = input.startDate ?? existing.startDate;
  const effectiveEnd = input.endDate === undefined ? existing.endDate : input.endDate;
  assertValidDateRange(effectiveStart, effectiveEnd);

  return prisma.experienceEntry.update({
    where: { id: experienceId },
    data: input,
  });
}

export async function deleteExperience(userId: string, experienceId: string): Promise<void> {
  await getOwnedExperienceOrThrow(userId, experienceId);
  await prisma.experienceEntry.delete({ where: { id: experienceId } });
}
