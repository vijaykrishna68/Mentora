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
  appointments: {
    list: ["appointments", "list"] as const,
  },
  mentorAppointments: {
    list: ["mentor-appointments", "list"] as const,
  },
  availability: {
    // A stable, explicit key per (mentor, offering, date) — invalidated after a
    // successful booking or a 409 conflict so stale slots can never be reused.
    forOfferingAndDate: (mentorId: string, offeringId: string, date: string) =>
      ["availability", mentorId, offeringId, date] as const,
    forMentor: (mentorId: string) => ["availability", mentorId] as const,
  },
  mentorProfileManagement: {
    // The mentor's own profile+readiness+experience — a single GET, so a
    // single key covers all three.
    mine: ["mentor-profile-management", "mine"] as const,
  },
  mentorOfferings: {
    list: ["mentor-offerings", "list"] as const,
  },
  mentorAvailability: {
    list: ["mentor-availability", "list"] as const,
  },
};
