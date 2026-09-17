import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import { fetchMyAvailabilityRules } from "./api";

export function useAvailabilityRules() {
  return useQuery({
    queryKey: queryKeys.mentorAvailability.list,
    queryFn: fetchMyAvailabilityRules,
  });
}
