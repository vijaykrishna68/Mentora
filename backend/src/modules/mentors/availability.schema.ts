import { z } from "zod";
import { Temporal } from "@js-temporal/polyfill";

export const mentorIdParamSchema = z.object({
  mentorId: z.string().uuid("mentorId must be a valid UUID"),
});

export const getAvailabilityQuerySchema = z.object({
  offeringId: z.string().uuid("offeringId must be a valid UUID"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format")
    .refine((value) => {
      try {
        Temporal.PlainDate.from(value);
        return true;
      } catch {
        return false;
      }
    }, "date must be a valid calendar date"),
});

export type GetAvailabilityQuery = z.infer<typeof getAvailabilityQuerySchema>;
