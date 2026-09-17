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
