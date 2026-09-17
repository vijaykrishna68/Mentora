import { apiRequest } from "@/lib/api/client";
import type { DiscoverMentorsResponse, DiscoverQueryParams } from "@/types";

export function fetchMentors(params: DiscoverQueryParams): Promise<DiscoverMentorsResponse> {
  const search = new URLSearchParams();
  if (params.category) search.set("category", params.category);
  if (params.q) search.set("q", params.q);
  if (params.sort) search.set("sort", params.sort);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));

  const query = search.toString();
  return apiRequest(`/mentors${query ? `?${query}` : ""}`);
}
