import type { Review } from "@prisma/client";

// Public-safe review shape — no customer email, no internal appointment/
// mentor foreign keys beyond what's already public (the review id itself).
export function toReviewDTO(review: Review, context: { customerDisplayName: string }) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    customer: { displayName: context.customerDisplayName },
  };
}
