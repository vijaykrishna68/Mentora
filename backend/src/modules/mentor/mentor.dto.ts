import type { MentorProfile } from "@prisma/client";

// Full data for a mentor managing their own profile. Never returned to
// anyone but the owning mentor (enforced by requireAuth + ownership lookup,
// not by this function — this only decides which fields exist at all).
export function toPrivateMentorProfileDTO(profile: MentorProfile) {
  return {
    id: profile.id,
    userId: profile.userId,
    headline: profile.headline,
    bio: profile.bio,
    country: profile.country,
    timezone: profile.timezone,
    phone: profile.phone,
    yearsExperience: profile.yearsExperience,
    primaryCategory: profile.primaryCategory,
    tags: profile.tags,
    connectionModes: profile.connectionModes,
    avatarUrl: profile.avatarUrl,
    faq: profile.faq,
    acceptingBookings: profile.acceptingBookings,
    onboardingComplete: profile.onboardingComplete,
    minimumNoticeMinutes: profile.minimumNoticeMinutes,
    maximumAdvanceDays: profile.maximumAdvanceDays,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export interface MentorPublicStats {
  averageRating: number | null;
  reviewCount: number;
  completedSessionCount: number;
}

// Public Discover/profile DTO (Phase 7). Deliberately excludes userId, phone,
// raw acceptingBookings/onboardingComplete internals, and timezone (how
// mentor time gets surfaced to customers is decided per-booking, not here).
//
// `name` comes from User, not MentorProfile — passed in explicitly since
// this function only receives the profile row. `stats` is optional and
// sourced from mentor-rating.ts (getMentorRatingSummary /
// getMentorCompletedSessionCount) — this function stays a pure serializer
// with no DB access of its own; the caller decides whether to fetch and
// attach stats.
export function toPublicMentorProfileDTO(profile: MentorProfile, name: string, stats?: MentorPublicStats) {
  return {
    id: profile.id,
    name,
    headline: profile.headline,
    bio: profile.bio,
    country: profile.country,
    yearsExperience: profile.yearsExperience,
    primaryCategory: profile.primaryCategory,
    tags: profile.tags,
    connectionModes: profile.connectionModes,
    avatarUrl: profile.avatarUrl,
    faq: profile.faq,
    ...(stats
      ? {
          averageRating: stats.averageRating,
          reviewCount: stats.reviewCount,
          completedSessionCount: stats.completedSessionCount,
        }
      : {}),
  };
}
