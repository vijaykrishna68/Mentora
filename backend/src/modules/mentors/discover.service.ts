import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { BOOKABLE_MENTOR_WHERE } from "../mentor/mentor.readiness.js";
import { toPublicMentorProfileDTO } from "../mentor/mentor.dto.js";
import { PUBLIC_OFFERING_SELECT, toPublicOfferingDTO } from "./public-offering.js";
import type { DiscoverQuery } from "./discover.schema.js";

// Deliberate query shape: this whole function issues a fixed, small number
// of queries regardless of how many mentors match (no per-mentor round
// trips) —
//   1. mentors matching the filters, with their active offerings and
//      display name pulled in via Prisma relation loading (still one round
//      trip per relation, not one per mentor row).
//   2 & 3. rating and completed-session stats for exactly those mentor ids,
//      each via a single grouped aggregate query.
// Sorting/pagination then happen in memory over that already-small,
// already-filtered result set. For a mentor directory at this project's
// scale that's simpler and just as correct as pushing an aggregate ORDER BY
// into SQL, and it avoids needing raw SQL to sort by a value (average
// rating) that lives in a different table.
export async function discoverMentors(query: DiscoverQuery) {
  const filters: Prisma.MentorProfileWhereInput[] = [BOOKABLE_MENTOR_WHERE];

  if (query.category) {
    filters.push({ primaryCategory: query.category });
  }

  if (query.q) {
    // Name + headline only — primaryCategory already has its own exact-match
    // `category` filter (searching it as free text would be an awkward
    // enum-vs-string match), and tags are skipped because Prisma's array
    // filters only support exact-value matching (`has`), not case-insensitive
    // substring matching, which wouldn't be a "clean" search experience.
    filters.push({
      OR: [
        { headline: { contains: query.q, mode: "insensitive" } },
        { user: { name: { contains: query.q, mode: "insensitive" } } },
      ],
    });
  }

  const mentors = await prisma.mentorProfile.findMany({
    where: { AND: filters },
    include: {
      user: { select: { name: true } },
      offerings: { where: { isActive: true }, select: PUBLIC_OFFERING_SELECT },
    },
  });

  const mentorIds = mentors.map((mentor) => mentor.id);

  const [ratingRows, sessionRows] = await Promise.all([
    prisma.review.groupBy({
      by: ["mentorProfileId"],
      where: { mentorProfileId: { in: mentorIds } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.appointment.groupBy({
      by: ["mentorProfileId"],
      where: { mentorProfileId: { in: mentorIds }, status: "CONFIRMED", endAt: { lt: new Date() } },
      _count: { _all: true },
    }),
  ]);

  const ratingByMentorId = new Map(
    ratingRows.map((row) => [
      row.mentorProfileId,
      { averageRating: Math.round((row._avg.rating ?? 0) * 10) / 10, reviewCount: row._count._all },
    ]),
  );
  const sessionCountByMentorId = new Map(sessionRows.map((row) => [row.mentorProfileId, row._count._all]));

  const enriched = mentors.map((mentor) => {
    const rating = ratingByMentorId.get(mentor.id) ?? { averageRating: null, reviewCount: 0 };
    const completedSessionCount = sessionCountByMentorId.get(mentor.id) ?? 0;
    return {
      item: {
        ...toPublicMentorProfileDTO(mentor, mentor.user.name, { ...rating, completedSessionCount }),
        offerings: mentor.offerings.map(toPublicOfferingDTO),
      },
      createdAt: mentor.createdAt.getTime(),
      // Unrated mentors sort after rated ones on a "rating" sort, never
      // treated as a 0-star rating.
      rating: rating.averageRating ?? -1,
      completedSessionCount,
    };
  });

  enriched.sort((a, b) => {
    if (query.sort === "rating") return b.rating - a.rating;
    if (query.sort === "sessions") return b.completedSessionCount - a.completedSessionCount;
    return b.createdAt - a.createdAt; // "newest"
  });

  const total = enriched.length;
  const start = (query.page - 1) * query.limit;
  const pageItems = enriched.slice(start, start + query.limit).map((entry) => entry.item);

  return {
    mentors: pageItems,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}
