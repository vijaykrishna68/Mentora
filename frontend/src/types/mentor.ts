import type { Category, ConnectionMode } from "./enums";
import type { PublicOffering } from "./offering";

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface ExperienceEntry {
  id: string;
  mentorProfileId: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
  order: number;
}

/** Returned only to the owning mentor (mentor.dto.ts `toPrivateMentorProfileDTO`). */
export interface PrivateMentorProfile {
  id: string;
  userId: string;
  headline: string | null;
  bio: string | null;
  country: string | null;
  timezone: string | null;
  phone: string | null;
  yearsExperience: number | null;
  primaryCategory: Category | null;
  tags: string[];
  connectionModes: ConnectionMode[];
  avatarUrl: string | null;
  faq: FaqEntry[] | null;
  acceptingBookings: boolean;
  onboardingComplete: boolean;
  minimumNoticeMinutes: number;
  maximumAdvanceDays: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * mentor.readiness.ts `MentorReadiness` — the single source of truth for
 * onboarding progress and bookability. Never recomputed on the frontend;
 * always the backend's own values.
 */
export interface MentorReadiness {
  hasRequiredProfileInfo: boolean;
  hasTimezone: boolean;
  hasActiveOffering: boolean;
  hasActiveAvailabilityRule: boolean;
  acceptingBookings: boolean;
  readyExcludingAcceptingBookings: boolean;
  isBookable: boolean;
  reasons: string[];
}

/** GET /api/mentor/profile response. */
export interface GetMyMentorProfileResponse {
  profile: PrivateMentorProfile;
  readiness: MentorReadiness;
  experienceEntries: ExperienceEntry[];
}

/** PATCH /api/mentor/profile response. */
export interface UpdateMentorProfileResponse {
  profile: PrivateMentorProfile;
  readiness: MentorReadiness;
}

/**
 * PATCH /api/mentor/profile request body (mentor-profile.schema.ts
 * `updateMentorProfileSchema`) — every field optional, onboarding is
 * progressively completable. `.strict()` on the backend rejects anything
 * else, notably a client-supplied `onboardingComplete`.
 */
export interface UpdateMentorProfileInput {
  headline?: string | null;
  bio?: string | null;
  country?: string | null;
  timezone?: string | null;
  phone?: string | null;
  yearsExperience?: number | null;
  primaryCategory?: Category | null;
  tags?: string[];
  connectionModes?: ConnectionMode[];
  avatarUrl?: string | null;
  acceptingBookings?: boolean;
}

/** POST /api/mentor/experience request body (mentor-experience.schema.ts `createExperienceSchema`). */
export interface CreateExperienceInput {
  organization: string;
  role: string;
  /** Plain date, e.g. "2024-01-15". */
  startDate: string;
  endDate?: string | null;
  description?: string | null;
  order?: number;
}

/** PATCH /api/mentor/experience/:id request body — every field optional. */
export type UpdateExperienceInput = Partial<CreateExperienceInput>;

export interface MentorPublicStats {
  averageRating: number | null;
  reviewCount: number;
  completedSessionCount: number;
}

/** Discover list item / public profile (mentor.dto.ts `toPublicMentorProfileDTO`). */
export interface PublicMentorProfile extends MentorPublicStats {
  id: string;
  name: string;
  headline: string | null;
  bio: string | null;
  country: string | null;
  yearsExperience: number | null;
  primaryCategory: Category | null;
  tags: string[];
  connectionModes: ConnectionMode[];
  avatarUrl: string | null;
  faq: FaqEntry[] | null;
}

/** discoverMentors() list item — offerings attached, no experience timeline. */
export interface PublicMentorSummary extends PublicMentorProfile {
  offerings: PublicOffering[];
}

/** Public experience-timeline entry (public-profile.service.ts, no mentorProfileId). */
export interface PublicExperienceEntry {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
  order: number;
}

/** GET /api/mentors/:mentorId — full public profile with experience timeline. */
export interface PublicMentorDetail extends PublicMentorSummary {
  experienceEntries: PublicExperienceEntry[];
}
