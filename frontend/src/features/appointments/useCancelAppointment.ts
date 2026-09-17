import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import { cancelAppointment } from "./api";

/** Cancellation eligibility (deadline/status) is decided entirely by the backend — this just calls the endpoint and lets its response drive the UI. */
export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentId: string) => cancelAppointment(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.list });
    },
  });
}
