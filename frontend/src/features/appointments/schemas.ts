import { z } from "zod";

// Mirrors backend/src/modules/appointments/review.schema.ts. Frontend
// validation is for UX only — the backend remains authoritative.
export const reviewFormSchema = z.object({
  rating: z.number().int().min(1, "Select a rating").max(5),
  comment: z.string().trim().max(2000, "Comment is too long").optional(),
});
export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
