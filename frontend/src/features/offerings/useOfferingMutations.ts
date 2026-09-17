import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import type { CreateOfferingInput, UpdateOfferingInput } from "@/types";
import { createOffering, deleteOffering, updateOffering } from "./api";

/**
 * Every offering mutation can change `hasActiveOffering` in the backend's
 * readiness computation, so the mentor's own profile/setup query is
 * invalidated alongside the offerings list itself — never re-derived here.
 */
function useInvalidateOfferingQueries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.mentorOfferings.list });
    queryClient.invalidateQueries({ queryKey: queryKeys.mentorProfileManagement.mine });
  };
}

export function useCreateOffering() {
  const invalidate = useInvalidateOfferingQueries();
  return useMutation({
    mutationFn: (input: CreateOfferingInput) => createOffering(input),
    onSuccess: invalidate,
  });
}

export function useUpdateOffering(id: string) {
  const invalidate = useInvalidateOfferingQueries();
  return useMutation({
    mutationFn: (input: UpdateOfferingInput) => updateOffering(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteOffering() {
  const invalidate = useInvalidateOfferingQueries();
  return useMutation({
    mutationFn: (id: string) => deleteOffering(id),
    onSuccess: invalidate,
  });
}
