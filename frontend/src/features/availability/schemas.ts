import { z } from "zod";

// Mirrors backend/src/modules/mentor/mentor-availability.schema.ts. Only
// obvious, structural checks live here (end before start, malformed time) —
// overlap detection is a backend-only concern (mentor-availability.service.ts
// `assertNoOverlap`), never duplicated here.
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:mm format, e.g. 18:00");

export const availabilityRuleFormSchema = z
  .object({
    dayOfWeek: z.string().min(1, "Choose a day"),
    startTime: timeString,
    endTime: timeString,
    bufferMinutes: z.number().int("Buffer must be a whole number").min(0, "Buffer cannot be negative").max(180, "Buffer can be at most 180 minutes"),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Start time must be before end time",
    path: ["endTime"],
  });
export type AvailabilityRuleFormValues = z.infer<typeof availabilityRuleFormSchema>;
