import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import { fetchMyOfferings } from "./api";

export function useOfferings() {
  return useQuery({
    queryKey: queryKeys.mentorOfferings.list,
    queryFn: fetchMyOfferings,
  });
}
