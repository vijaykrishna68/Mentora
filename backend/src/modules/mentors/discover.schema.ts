import { z } from "zod";
import { Category } from "@prisma/client";

// Deliberately small: the product docs only ever describe "search, filter,
// sort" in general terms and never enumerate exact sort keys (03b-data-api-
// architecture.md §56 explicitly defers the exact filtering behavior). Rather
// than invent a ranking/relevance score, the only sort options are ones
// directly backed by an existing, undisputed field or already-derived stat.
export const discoverSortValues = ["newest", "rating", "sessions"] as const;

export const discoverQuerySchema = z.object({
  category: z.enum(Category).optional(),
  q: z.string().trim().min(1, "q must not be empty").max(200).optional(),
  sort: z.enum(discoverSortValues).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type DiscoverQuery = z.infer<typeof discoverQuerySchema>;
