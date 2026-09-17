import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import { fetchMyAppointments } from "./api";

export function useAppointments() {
  return useQuery({
    queryKey: queryKeys.appointments.list,
    queryFn: fetchMyAppointments,
  });
}
