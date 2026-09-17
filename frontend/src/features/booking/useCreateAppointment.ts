import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/queryKeys";
import type { CreateAppointmentInput } from "@/types";
import { createAppointment } from "./api";

/**
 * Availability is invalidated on both outcomes that can make the previously
 * fetched slots stale: a successful booking (that slot is gone) and a 409
 * conflict (someone else just took it). TanStack Query's own mutation
 * lifecycle already guarantees a single in-flight call per `mutate()` — the
 * caller is responsible for not calling `mutate()` again while `isPending`.
 */
export function useCreateAppointment(mentorId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAppointmentInput) => createAppointment(input),
    onSettled: (_data, error) => {
      const isConflict = isApiError(error) && error.status === 409;
      if (!error || isConflict) {
        queryClient.invalidateQueries({ queryKey: queryKeys.availability.forMentor(mentorId) });
      }
    },
  });
}
