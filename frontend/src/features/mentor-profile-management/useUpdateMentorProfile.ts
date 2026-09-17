import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import type { UpdateMentorProfileInput } from "@/types";
import { updateMyMentorProfile } from "./api";

/**
 * Readiness (including whether accepting-bookings can even be turned on) is
 * recomputed by the backend on every update and comes back in the response —
 * never re-derived here. Invalidating the own-profile query refetches
 * experienceEntries too, kept in the same GET response.
 */
export function useUpdateMentorProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateMentorProfileInput) => updateMyMentorProfile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mentorProfileManagement.mine });
    },
  });
}
