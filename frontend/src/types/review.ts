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
