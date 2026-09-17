import { z } from "zod";
import { Category, ConnectionMode } from "@prisma/client";

function isValidIanaTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

// Every field optional — onboarding is progressively completable, not a
// single wizard submission. `.strict()` rejects unknown keys, notably a
// client-supplied `onboardingComplete` (which must never be settable here).
export const updateMentorProfileSchema = z
  .object({
    headline: z.string().trim().min(1).max(160).nullable().optional(),
    bio: z.string().trim().min(1).max(2000).nullable().optional(),
    country: z.string().trim().length(2, "Use a 2-letter ISO country code").toUpperCase().nullable().optional(),
    timezone: z
      .string()
      .refine(isValidIanaTimeZone, "Must be a valid IANA timezone identifier, e.g. Asia/Kolkata")
      .nullable()
      .optional(),
    phone: z.string().trim().min(5).max(30).nullable().optional(),
    yearsExperience: z.number().int().min(0).max(80).nullable().optional(),
    primaryCategory: z.enum(Category).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    connectionModes: z.array(z.enum(ConnectionMode)).max(10).optional(),
    avatarUrl: z.string().url().nullable().optional(),
    faq: z
      .array(
        z.object({
          question: z.string().trim().min(1).max(200),
          answer: z.string().trim().min(1).max(1000),
        }),
      )
      .max(20)
      .optional(),
    acceptingBookings: z.boolean().optional(),
    // Phase 4 booking constraints — bounded to sane ranges (up to 7 days'
    // notice, up to a year of advance booking).
    minimumNoticeMinutes: z.number().int().min(0).max(7 * 24 * 60).optional(),
    maximumAdvanceDays: z.number().int().min(1).max(365).optional(),
  })
  .strict();

export type UpdateMentorProfileInput = z.infer<typeof updateMentorProfileSchema>;
