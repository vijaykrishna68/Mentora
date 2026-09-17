import { z } from "zod";

// Mirrors backend/src/modules/mentor/mentor-profile.schema.ts loosely — every
// field is optional here too (progressive onboarding), with lighter
// conditional checks for UX. The backend re-validates authoritatively; this
// never invents a stricter or contradictory rule.
export const mentorProfileFormSchema = z.object({
  headline: z.string().trim().max(160, "Keep it under 160 characters").optional(),
  bio: z.string().trim().max(2000, "Keep it under 2000 characters").optional(),
  country: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || value.length === 2, "Use a 2-letter ISO country code, e.g. IN"),
  timezone: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || value.length >= 5, "Enter a valid phone number"),
  yearsExperience: z
    .union([z.number(), z.nan()])
    .optional()
    .refine((value) => value === undefined || Number.isNaN(value) || (value >= 0 && value <= 80), "Enter a value between 0 and 80"),
  primaryCategory: z.string().optional(),
  tags: z.array(z.string()).max(20, "Up to 20 tags").optional(),
  connectionModes: z.array(z.string()).optional(),
  avatarUrl: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^https?:\/\//i.test(value), "Enter a valid URL starting with http:// or https://"),
});
export type MentorProfileFormValues = z.infer<typeof mentorProfileFormSchema>;

// Mirrors backend/src/modules/mentor/mentor-experience.schema.ts. Dates are
// plain HTML date-input strings ("YYYY-MM-DD") — lexical comparison is
// sufficient for start/end ordering.
export const experienceFormSchema = z
  .object({
    organization: z.string().trim().min(1, "Organization is required").max(160),
    role: z.string().trim().min(1, "Role is required").max(160),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
    isCurrent: z.boolean().optional(),
    description: z.string().trim().max(2000, "Keep it under 2000 characters").optional(),
  })
  .refine((data) => data.isCurrent || !data.endDate || data.endDate >= data.startDate, {
    message: "End date cannot be before the start date",
    path: ["endDate"],
  });
export type ExperienceFormValues = z.infer<typeof experienceFormSchema>;
