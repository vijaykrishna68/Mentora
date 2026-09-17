import { z } from "zod";
import { Temporal } from "@js-temporal/polyfill";
import { ConnectionMode } from "@prisma/client";

// `.strict()` rejects any client-supplied endAt/duration/price/currency/
// timezone/category/status outright — the backend derives all of those.
export const createAppointmentSchema = z
  .object({
    mentorId: z.string().uuid("mentorId must be a valid UUID"),
    offeringId: z.string().uuid("offeringId must be a valid UUID"),
    startAt: z.string().refine((value) => {
      try {
        Temporal.Instant.from(value);
        return true;
      } catch {
        return false;
      }
    }, "startAt must be a valid ISO 8601 UTC instant"),
    connectionMode: z.enum(ConnectionMode),
  })
  .strict();

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
