import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import type { CreateReviewInput } from "@/types";
import { submitReview } from "./api";

export function useSubmitReview(appointmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReviewInput) => submitReview(appointmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.list });
    },
  });
}
