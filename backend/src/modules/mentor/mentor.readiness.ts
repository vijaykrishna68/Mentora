import { prisma } from "../../lib/prisma.js";
import type { MentorProfile, Prisma } from "@prisma/client";

export interface MentorReadiness {
  hasRequiredProfileInfo: boolean;
  hasTimezone: boolean;
  hasActiveOffering: boolean;
  hasActiveAvailabilityRule: boolean;
  acceptingBookings: boolean;
  // Conditions 1-4 only — used to gate turning acceptingBookings on.
  readyExcludingAcceptingBookings: boolean;
  // All 5 conditions — this is what onboardingComplete must always equal.
  isBookable: boolean;
  reasons: string[];
}

// The single source of truth for "is this mentor ready to be
// discoverable/bookable." Never trust a client-supplied onboardingComplete —
// always recompute it from the actual underlying data.
export async function getMentorReadiness(mentorProfileId: string): Promise<MentorReadiness> {
  const [profile, activeOfferingCount, activeRuleCount] = await Promise.all([
    prisma.mentorProfile.findUniqueOrThrow({ where: { id: mentorProfileId } }),
    prisma.offering.count({ where: { mentorProfileId, isActive: true } }),
    prisma.availabilityRule.count({ where: { mentorProfileId, isActive: true } }),
  ]);

  return computeReadiness(profile, activeOfferingCount, activeRuleCount);
}

function computeReadiness(
  profile: MentorProfile,
  activeOfferingCount: number,
  activeRuleCount: number,
): MentorReadiness {
  const hasRequiredProfileInfo = Boolean(profile.headline?.trim() && profile.bio?.trim());
  const hasTimezone = Boolean(profile.timezone);
  const hasActiveOffering = activeOfferingCount > 0;
  const hasActiveAvailabilityRule = activeRuleCount > 0;
  const acceptingBookings = profile.acceptingBookings;

  const readyExcludingAcceptingBookings =
    hasRequiredProfileInfo && hasTimezone && hasActiveOffering && hasActiveAvailabilityRule;

  const reasons: string[] = [];
  if (!hasRequiredProfileInfo) reasons.push("Add a headline and bio to your profile.");
  if (!hasTimezone) reasons.push("Set your timezone.");
  if (!hasActiveOffering) reasons.push("Create at least one active offering.");
  if (!hasActiveAvailabilityRule) reasons.push("Add at least one active availability rule.");
  if (!acceptingBookings) reasons.push("Turn on accepting bookings.");

  return {
    hasRequiredProfileInfo,
    hasTimezone,
    hasActiveOffering,
    hasActiveAvailabilityRule,
    acceptingBookings,
    readyExcludingAcceptingBookings,
    isBookable: readyExcludingAcceptingBookings && acceptingBookings,
    reasons,
  };
}

// Bulk-filtering equivalent of computeReadiness()'s 5 conditions, for
// Discover (Phase 7) — expressed as a Prisma where-fragment so the check
// happens in one SQL query across all candidate mentors instead of calling
// getMentorReadiness() once per mentor (which would be an N+1 query pattern).
// `headline`/`bio` only need `not: null` (not an explicit non-empty check):
// the mentor-profile write path (mentor-profile.schema.ts) already validates
// `.trim().min(1)` before either field can be persisted as non-null, so a
// stored non-null value is guaranteed non-empty. Keep in sync with
// computeReadiness() above if the 5 conditions ever change.
export const BOOKABLE_MENTOR_WHERE: Prisma.MentorProfileWhereInput = {
  headline: { not: null },
  bio: { not: null },
  timezone: { not: null },
  acceptingBookings: true,
  offerings: { some: { isActive: true } },
  availabilityRules: { some: { isActive: true } },
};

// Recomputes readiness and persists onboardingComplete to match it exactly.
// Call this after any mutation that could change one of the 5 inputs above
// (profile edits, offering create/update/delete, availability create/update/
// delete). This is the only place onboardingComplete is ever written.
export async function syncOnboardingComplete(
  mentorProfileId: string,
): Promise<{ readiness: MentorReadiness; profile: MentorProfile }> {
  const readiness = await getMentorReadiness(mentorProfileId);
  const profile = await prisma.mentorProfile.update({
    where: { id: mentorProfileId },
    data: { onboardingComplete: readiness.isBookable },
  });
  return { readiness, profile };
}
