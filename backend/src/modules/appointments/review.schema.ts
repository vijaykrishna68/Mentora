import { z } from "zod";

// `.strict()` rejects mentorId/customerId/appointmentId/createdAt outright —
// those are always derived server-side (from the URL param and the
// authenticated user), never accepted from the client.
export const createReviewSchema = z
  .object({
    rating: z.number().int("Rating must be a whole number").min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
    comment: z.string().trim().max(2000, "Comment is too long").nullable().optional(),
  })
  .strict();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
