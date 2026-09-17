import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { getOwnMentorProfileOrThrow } from "./mentor.util.js";
import { syncOnboardingComplete } from "./mentor.readiness.js";
import type { DayOfWeek, AvailabilityRule } from "@prisma/client";
import type { CreateAvailabilityRuleInput, UpdateAvailabilityRuleInput } from "./mentor-availability.schema.js";

// AvailabilityRule.startTime/endTime are stored as @db.Time, which Prisma
// represents as a Date anchored at 1970-01-01 UTC — only the time-of-day
// component is meaningful. These helpers convert to/from the "HH:mm" strings
// the API accepts and returns.
function parseTimeStringToDate(value: string): Date {
  const [hourStr, minuteStr] = value.split(":");
  return new Date(Date.UTC(1970, 0, 1, Number(hourStr), Number(minuteStr), 0));
}

function formatTimeOfDay(date: Date): string {
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function toAvailabilityRuleDTO(rule: AvailabilityRule) {
  return {
    id: rule.id,
    mentorProfileId: rule.mentorProfileId,
    dayOfWeek: rule.dayOfWeek,
    startTime: formatTimeOfDay(rule.startTime),
    endTime: formatTimeOfDay(rule.endTime),
    bufferMinutes: rule.bufferMinutes,
    isActive: rule.isActive,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

function minutesSinceMidnight(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return minutesSinceMidnight(startA) < minutesSinceMidnight(endB) && minutesSinceMidnight(startB) < minutesSinceMidnight(endA);
}

async function assertNoOverlap(
  mentorProfileId: string,
  dayOfWeek: DayOfWeek,
  startTime: Date,
  endTime: Date,
  excludeId?: string,
): Promise<void> {
  const siblings = await prisma.availabilityRule.findMany({
    where: {
      mentorProfileId,
      dayOfWeek,
      isActive: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  const conflict = siblings.some((rule) => rangesOverlap(startTime, endTime, rule.startTime, rule.endTime));
  if (conflict) {
    throw new AppError(
      409,
      "AVAILABILITY_OVERLAP",
      "This time range overlaps with an existing availability rule on the same day.",
    );
  }
}

async function getOwnedRuleOrThrow(userId: string, ruleId: string) {
  const rule = await prisma.availabilityRule.findUnique({
    where: { id: ruleId },
    include: { mentorProfile: { select: { userId: true } } },
  });
  if (!rule) {
    throw new AppError(404, "AVAILABILITY_RULE_NOT_FOUND", "Availability rule not found.");
  }
  if (rule.mentorProfile.userId !== userId) {
    throw new AppError(403, "FORBIDDEN", "You do not own this availability rule.");
  }
  return rule;
}

export async function listAvailabilityRules(userId: string) {
  const profile = await getOwnMentorProfileOrThrow(userId);
  const rules = await prisma.availabilityRule.findMany({
    where: { mentorProfileId: profile.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return rules.map(toAvailabilityRuleDTO);
}

export async function createAvailabilityRule(userId: string, input: CreateAvailabilityRuleInput) {
  const profile = await getOwnMentorProfileOrThrow(userId);
  if (!profile.timezone) {
    throw new AppError(400, "TIMEZONE_NOT_CONFIGURED", "Set your timezone before adding availability.");
  }

  const startTime = parseTimeStringToDate(input.startTime);
  const endTime = parseTimeStringToDate(input.endTime);
  await assertNoOverlap(profile.id, input.dayOfWeek, startTime, endTime);

  const rule = await prisma.availabilityRule.create({
    data: {
      mentorProfileId: profile.id,
      dayOfWeek: input.dayOfWeek,
      startTime,
      endTime,
      bufferMinutes: input.bufferMinutes,
      isActive: input.isActive ?? true,
    },
  });
  const { readiness } = await syncOnboardingComplete(profile.id);
  return { rule: toAvailabilityRuleDTO(rule), readiness };
}

export async function updateAvailabilityRule(userId: string, ruleId: string, input: UpdateAvailabilityRuleInput) {
  const existing = await getOwnedRuleOrThrow(userId, ruleId);

  const dayOfWeek = input.dayOfWeek ?? existing.dayOfWeek;
  const startTime = input.startTime ? parseTimeStringToDate(input.startTime) : existing.startTime;
  const endTime = input.endTime ? parseTimeStringToDate(input.endTime) : existing.endTime;

  if (minutesSinceMidnight(startTime) >= minutesSinceMidnight(endTime)) {
    throw new AppError(400, "INVALID_TIME_RANGE", "startTime must be before endTime.");
  }
  if (input.dayOfWeek || input.startTime || input.endTime) {
    await assertNoOverlap(existing.mentorProfileId, dayOfWeek, startTime, endTime, existing.id);
  }

  const rule = await prisma.availabilityRule.update({
    where: { id: ruleId },
    data: {
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime ? startTime : undefined,
      endTime: input.endTime ? endTime : undefined,
      bufferMinutes: input.bufferMinutes,
      isActive: input.isActive,
    },
  });
  const { readiness } = await syncOnboardingComplete(existing.mentorProfileId);
  return { rule: toAvailabilityRuleDTO(rule), readiness };
}

export async function deleteAvailabilityRule(userId: string, ruleId: string) {
  const existing = await getOwnedRuleOrThrow(userId, ruleId);
  // No historical dependency on availability rules (appointments only
  // reference offerings), so a real delete is always safe.
  await prisma.availabilityRule.delete({ where: { id: ruleId } });
  const { readiness } = await syncOnboardingComplete(existing.mentorProfileId);
  return { readiness };
}
