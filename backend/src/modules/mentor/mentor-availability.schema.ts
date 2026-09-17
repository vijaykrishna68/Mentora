import { z } from "zod";
import { DayOfWeek } from "@prisma/client";

// 24-hour "HH:mm" — matches what the seed data / slot-generation phase will
// expect, and keeps request/response symmetric (see mentor-availability.dto).
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:mm format, e.g. 18:00");

export const createAvailabilityRuleSchema = z
  .object({
    dayOfWeek: z.enum(DayOfWeek),
    startTime: timeString,
    endTime: timeString,
    bufferMinutes: z.number().int().min(0, "bufferMinutes cannot be negative").max(180).default(0),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "startTime must be before endTime",
    path: ["endTime"],
  });

export type CreateAvailabilityRuleInput = z.infer<typeof createAvailabilityRuleSchema>;

// No cross-field refine: a PATCH may only touch one of startTime/endTime, so
// the authoritative check happens in the service against the merged record.
export const updateAvailabilityRuleSchema = z
  .object({
    dayOfWeek: z.enum(DayOfWeek).optional(),
    startTime: timeString.optional(),
    endTime: timeString.optional(),
    bufferMinutes: z.number().int().min(0, "bufferMinutes cannot be negative").max(180).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type UpdateAvailabilityRuleInput = z.infer<typeof updateAvailabilityRuleSchema>;
