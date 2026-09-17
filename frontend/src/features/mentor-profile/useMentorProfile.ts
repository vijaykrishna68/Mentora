import { useQuery } from "@tanstack/react-query";
import { isApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/queryKeys";
import { fetchMentorProfile } from "./api";

export function useMentorProfile(mentorId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.mentorProfile.detail(mentorId ?? ""),
    queryFn: () => fetchMentorProfile(mentorId as string),
    enabled: Boolean(mentorId),
    // A 404 (mentor genuinely doesn't exist) is a distinct UI state, not a
    // transient failure — retrying won't change the outcome.
    retry: (failureCount, error) => {
      if (isApiError(error) && error.status === 404) return false;
      return failureCount < 2;
    },
  });
}
