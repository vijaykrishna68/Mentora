import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import type { CreateAvailabilityRuleInput, UpdateAvailabilityRuleInput } from "@/types";
import { createAvailabilityRule, deleteAvailabilityRule, updateAvailabilityRule } from "./api";

/**
 * Every availability mutation can change `hasActiveAvailabilityRule` in the
 * backend's readiness computation, so the mentor's own profile/setup query
 * is invalidated alongside the rules list. The public per-mentor availability
 * cache (queryKeys.availability.*) is a customer-session concern — a mentor
 * editing their own schedule has nothing of that cached in their own query
 * client, so there's nothing there to invalidate.
 */
function useInvalidateAvailabilityQueries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.mentorAvailability.list });
    queryClient.invalidateQueries({ queryKey: queryKeys.mentorProfileManagement.mine });
  };
}

export function useCreateAvailabilityRule() {
  const invalidate = useInvalidateAvailabilityQueries();
  return useMutation({
    mutationFn: (input: CreateAvailabilityRuleInput) => createAvailabilityRule(input),
    onSuccess: invalidate,
  });
}

export function useUpdateAvailabilityRule(id: string) {
  const invalidate = useInvalidateAvailabilityQueries();
  return useMutation({
    mutationFn: (input: UpdateAvailabilityRuleInput) => updateAvailabilityRule(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteAvailabilityRule() {
  const invalidate = useInvalidateAvailabilityQueries();
  return useMutation({
    mutationFn: (id: string) => deleteAvailabilityRule(id),
    onSuccess: invalidate,
  });
}
