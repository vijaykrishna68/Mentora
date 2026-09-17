import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import { fetchAvailability } from "./api";

/**
 * Deliberately does NOT use `keepPreviousData`: the query key changes with
 * `date`, and showing the previous date's slots while the new date loads
 * would risk a user booking the wrong day. Revisiting an already-fetched
 * date still resolves instantly from TanStack Query's own per-key cache —
 * this only affects a genuinely new (mentor, offering, date) combination.
 */
export function useAvailability(mentorId: string | undefined, offeringId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: queryKeys.availability.forOfferingAndDate(mentorId ?? "", offeringId ?? "", date ?? ""),
    queryFn: () => fetchAvailability(mentorId as string, offeringId as string, date as string),
    enabled: Boolean(mentorId && offeringId && date),
  });
}
