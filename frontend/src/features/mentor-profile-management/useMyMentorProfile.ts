import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import { fetchMyMentorProfile } from "./api";

export function useMyMentorProfile() {
  return useQuery({
    queryKey: queryKeys.mentorProfileManagement.mine,
    queryFn: fetchMyMentorProfile,
  });
}
