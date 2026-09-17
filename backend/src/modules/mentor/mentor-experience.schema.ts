import { z } from "zod";

const dateLike = z.coerce.date();

export const createExperienceSchema = z
  .object({
    organization: z.string().trim().min(1).max(160),
    role: z.string().trim().min(1).max(160),
    startDate: dateLike,
    endDate: dateLike.nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    order: z.number().int().min(0).optional(),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: "endDate cannot precede startDate",
    path: ["endDate"],
  });

export type CreateExperienceInput = z.infer<typeof createExperienceSchema>;

// No cross-field date refine here: a PATCH may touch only one of
// startDate/endDate, so the authoritative check happens in the service
// against the merged (existing + incoming) record.
export const updateExperienceSchema = z
  .object({
    organization: z.string().trim().min(1).max(160).optional(),
    role: z.string().trim().min(1).max(160).optional(),
    startDate: dateLike.optional(),
    endDate: dateLike.nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    order: z.number().int().min(0).optional(),
  })
  .strict();

export type UpdateExperienceInput = z.infer<typeof updateExperienceSchema>;
