import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import type { DiscoverQueryParams } from "@/types";
import { fetchMentors } from "./api";

/**
 * `keepPreviousData` means a filter/page change keeps showing the current
 * results (with `isFetching` true) instead of flashing back to the initial
 * skeleton state — the full skeleton grid is reserved for the very first
 * load, when there's no previous data to keep.
 */
export function useMentors(params: DiscoverQueryParams) {
  return useQuery({
    queryKey: queryKeys.discover.list(params),
    queryFn: () => fetchMentors(params),
    placeholderData: keepPreviousData,
  });
}
