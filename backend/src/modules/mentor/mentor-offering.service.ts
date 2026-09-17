import type { Offering } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { getOwnMentorProfileOrThrow } from "./mentor.util.js";
import { syncOnboardingComplete } from "./mentor.readiness.js";
import type { CreateOfferingInput, UpdateOfferingInput } from "./mentor-offering.schema.js";

// Prisma's Decimal has a toJSON() that returns a STRING, so an offering row
// returned as-is would serialize `price` as e.g. "400" instead of 400 —
// inconsistent with every other place price appears in the API (Discover,
// public profile, appointment offeringSnapshot all already convert this).
// Every mentor-offering response is a mentor's own row, never someone else's
// data, so there's no privacy concern here — only this one type fix.
function toMentorOfferingDTO(offering: Offering) {
  return { ...offering, price: Number(offering.price) };
}

async function getOwnedOfferingOrThrow(userId: string, offeringId: string) {
  const offering = await prisma.offering.findUnique({
    where: { id: offeringId },
    include: { mentorProfile: { select: { userId: true } } },
  });
  if (!offering) {
    throw new AppError(404, "OFFERING_NOT_FOUND", "Offering not found.");
  }
  if (offering.mentorProfile.userId !== userId) {
    throw new AppError(403, "FORBIDDEN", "You do not own this offering.");
  }
  return offering;
}

export async function listOfferings(userId: string) {
  const profile = await getOwnMentorProfileOrThrow(userId);
  const offerings = await prisma.offering.findMany({
    where: { mentorProfileId: profile.id },
    orderBy: { createdAt: "asc" },
  });
  return offerings.map(toMentorOfferingDTO);
}

export async function createOffering(userId: string, input: CreateOfferingInput) {
  const profile = await getOwnMentorProfileOrThrow(userId);
  const offering = await prisma.offering.create({
    data: {
      mentorProfileId: profile.id,
      name: input.name,
      description: input.description ?? null,
      category: input.category,
      durationMinutes: input.durationMinutes,
      price: input.price,
      currency: input.currency,
      connectionModes: input.connectionModes,
      availabilityCategories: input.availabilityCategories,
      isActive: input.isActive ?? true,
    },
  });
  const { readiness } = await syncOnboardingComplete(profile.id);
  return { offering: toMentorOfferingDTO(offering), readiness };
}

export async function updateOffering(userId: string, offeringId: string, input: UpdateOfferingInput) {
  const existing = await getOwnedOfferingOrThrow(userId, offeringId);
  const offering = await prisma.offering.update({ where: { id: offeringId }, data: input });
  const { readiness } = await syncOnboardingComplete(existing.mentorProfileId);
  return { offering: toMentorOfferingDTO(offering), readiness };
}

// v1 delete behavior: appointments hold an offeringSnapshot precisely so
// historical records survive offering changes, and Appointment.offeringId
// has ON DELETE RESTRICT — a hard delete of an offering that has ever been
// booked is already impossible at the DB level. Rather than surface that as
// a confusing FK-violation-shaped error, we check first and choose the safe
// action ourselves: hard-delete only when nothing references it, otherwise
// archive (isActive=false) and say so in the response.
export async function deleteOffering(userId: string, offeringId: string) {
  const existing = await getOwnedOfferingOrThrow(userId, offeringId);
  const appointmentCount = await prisma.appointment.count({ where: { offeringId } });

  if (appointmentCount === 0) {
    await prisma.offering.delete({ where: { id: offeringId } });
    const { readiness } = await syncOnboardingComplete(existing.mentorProfileId);
    return { deleted: true, archived: false, offering: null, readiness };
  }

  const offering = await prisma.offering.update({ where: { id: offeringId }, data: { isActive: false } });
  const { readiness } = await syncOnboardingComplete(existing.mentorProfileId);
  return { deleted: false, archived: true, offering: toMentorOfferingDTO(offering), readiness };
}
