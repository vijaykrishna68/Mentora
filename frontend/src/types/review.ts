/** review.dto.ts `toReviewDTO` — public-safe review shape. */
export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customer: { displayName: string };
}

/** The compact review reference embedded in an appointment list item. */
export interface AppointmentReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

/**
 * POST /api/appointments/:id/review request body (review.schema.ts
 * `createReviewSchema`, `.strict()`). appointmentId/customerId are derived
 * server-side from the URL param and the authenticated user.
 */
export interface CreateReviewInput {
  rating: number;
  comment?: string | null;
}
