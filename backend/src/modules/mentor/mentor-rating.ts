import { prisma } from "../../lib/prisma.js";

export interface MentorRatingSummary {
  averageRating: number | null;
  reviewCount: number;
}

// No mutable rating counter anywhere — always derived live from Review rows.
// A mentor with zero reviews gets `averageRating: null`, never 0 (0 would
// misrepresent "no data" as "rated zero stars").
export async function getMentorRatingSummary(mentorProfileId: string): Promise<MentorRatingSummary> {
  const result = await prisma.review.aggregate({
    where: { mentorProfileId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const reviewCount = result._count.rating;
  return {
    reviewCount,
    averageRating: reviewCount > 0 ? Math.round((result._avg.rating ?? 0) * 10) / 10 : null,
  };
}

// "Sessions completed" = count of effectively completed appointments,
// derived live — never a manually editable counter. Cancelled appointments
// are never counted, regardless of how far in the past they are.
export async function getMentorCompletedSessionCount(mentorProfileId: string): Promise<number> {
  return prisma.appointment.count({
    where: { mentorProfileId, status: "CONFIRMED", endAt: { lt: new Date() } },
  });
}
