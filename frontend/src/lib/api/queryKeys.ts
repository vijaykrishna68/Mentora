import type { DiscoverQueryParams } from "@/types";

/**
 * Central query-key registry. Feature hooks import from here rather than
 * inlining key arrays, so invalidation stays consistent as features grow.
 */
export const queryKeys = {
  auth: {
    session: ["auth", "session"] as const,
  },
  discover: {
    list: (params: DiscoverQueryParams) => ["discover", "list", params] as const,
  },
  mentorProfile: {
    detail: (mentorId: string) => ["mentor-profile", mentorId] as const,
  },
  availability: {
    // A stable, explicit key per (mentor, offering, date) — invalidated after a
    // successful booking or a 409 conflict so stale slots can never be reused.
    forOfferingAndDate: (mentorId: string, offeringId: string, date: string) =>
      ["availability", mentorId, offeringId, date] as const,
    forMentor: (mentorId: string) => ["availability", mentorId] as const,
  },
};
