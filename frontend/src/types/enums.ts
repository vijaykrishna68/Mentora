/**
 * Mirrors the Prisma enums in backend/prisma/schema.prisma.
 * `erasableSyntaxOnly` is on for this project, so these are string-literal
 * unions + const value arrays rather than TypeScript `enum` declarations.
 */

export const ROLES = ["CUSTOMER", "MENTOR"] as const;
export type Role = (typeof ROLES)[number];

// COMPLETED is an effective status the backend derives at read time
// (CONFIRMED + endAt in the past) — never persisted, but always present in
// API responses in place of a stale CONFIRMED. See appointment.dto.ts.
export const APPOINTMENT_STATUSES = ["CONFIRMED", "CANCELLED", "COMPLETED"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const CONNECTION_MODES = ["GOOGLE_MEET", "ZOOM", "PHONE", "IN_PERSON"] as const;
export type ConnectionMode = (typeof CONNECTION_MODES)[number];

export const AVAILABILITY_CATEGORIES = ["MORNING", "AFTERNOON", "EVENING"] as const;
export type AvailabilityCategory = (typeof AVAILABILITY_CATEGORIES)[number];

export const CATEGORIES = [
  "CAREER_GROWTH",
  "INTERVIEW_PREPARATION",
  "LEADERSHIP",
  "FRONTEND",
  "BACKEND",
  "SYSTEM_DESIGN",
  "ENTREPRENEURSHIP",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  CAREER_GROWTH: "Career Growth",
  INTERVIEW_PREPARATION: "Interview Preparation",
  LEADERSHIP: "Leadership",
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  SYSTEM_DESIGN: "System Design",
  ENTREPRENEURSHIP: "Entrepreneurship",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  CONFIRMED: "Upcoming",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

export const CONNECTION_MODE_LABELS: Record<ConnectionMode, string> = {
  GOOGLE_MEET: "Google Meet",
  ZOOM: "Zoom",
  PHONE: "Phone",
  IN_PERSON: "In person",
};

export const AVAILABILITY_CATEGORY_LABELS: Record<AvailabilityCategory, string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
};

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};
