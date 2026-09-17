import type { Category } from "./enums";
import type { PublicMentorSummary } from "./mentor";
import type { Pagination } from "./api";

/** Mirrors backend/src/modules/mentors/discover.schema.ts `discoverSortValues`. */
export const DISCOVER_SORT_VALUES = ["newest", "rating", "sessions"] as const;
export type DiscoverSort = (typeof DISCOVER_SORT_VALUES)[number];

export const DISCOVER_SORT_LABELS: Record<DiscoverSort, string> = {
  newest: "Newest",
  rating: "Highest rated",
  sessions: "Most sessions",
};

/** GET /api/mentors query params — only what discover.schema.ts actually accepts. */
export interface DiscoverQueryParams {
  category?: Category;
  q?: string;
  sort?: DiscoverSort;
  page?: number;
  limit?: number;
}

/** GET /api/mentors response (discover.service.ts `discoverMentors`). */
export interface DiscoverMentorsResponse {
  mentors: PublicMentorSummary[];
  pagination: Pagination;
}
