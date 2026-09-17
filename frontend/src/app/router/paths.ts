import type { Role } from "@/types";

/** Centralized route paths — components should import these, not literal strings. */
export const paths = {
  login: "/login",
  signup: "/signup",

  discover: "/discover",
  mentorProfile: (mentorId: string) => `/mentors/${mentorId}`,
  appointments: "/appointments",

  mentorSetup: "/mentor/setup",
  mentorDashboard: "/mentor",
  mentorOfferings: "/mentor/offerings",
  mentorAvailability: "/mentor/availability",
  mentorAppointments: "/mentor/appointments",
  mentorProfileSettings: "/mentor/profile",
} as const;

export function roleHomePath(role: Role): string {
  return role === "MENTOR" ? paths.mentorDashboard : paths.discover;
}
