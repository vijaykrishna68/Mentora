import type { AvailabilityCategory, DayOfWeek } from "./enums";
import type { MentorReadiness } from "./mentor";

/** A mentor's recurring weekly rule (managed by the mentor, not derived). */
export interface AvailabilityRule {
  id: string;
  mentorProfileId: string;
  dayOfWeek: DayOfWeek;
  /** Wall-clock local time (HH:mm), interpreted in the mentor's profile timezone. */
  startTime: string;
  endTime: string;
  bufferMinutes: number;
  isActive: boolean;
}

/** A single bookable occurrence — derived, never persisted (03a §1). */
export interface AvailabilitySlot {
  startAt: string;
  endAt: string;
  category: AvailabilityCategory;
}

/** GET /api/mentors/:mentorId/availability response (availability.service.ts). */
export interface PublicAvailabilityResponse {
  mentorId: string;
  offeringId: string;
  date: string;
  timezone: string | null;
  slots: AvailabilitySlot[];
}

/** POST /api/mentor/availability request body (mentor-availability.schema.ts `createAvailabilityRuleSchema`). */
export interface CreateAvailabilityRuleInput {
  dayOfWeek: DayOfWeek;
  /** 24-hour "HH:mm", e.g. "09:00". */
  startTime: string;
  endTime: string;
  bufferMinutes?: number;
  isActive?: boolean;
}

/** PATCH /api/mentor/availability/:id request body — every field optional. */
export type UpdateAvailabilityRuleInput = Partial<CreateAvailabilityRuleInput>;

/** POST/PATCH /api/mentor/availability(/:id) response. */
export interface AvailabilityRuleMutationResponse {
  rule: AvailabilityRule;
  readiness: MentorReadiness;
}

/** DELETE /api/mentor/availability/:id response. */
export interface DeleteAvailabilityRuleResponse {
  readiness: MentorReadiness;
}
