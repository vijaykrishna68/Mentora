import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import { fetchMentorAppointments } from "./api";

export function useMentorAppointments() {
  return useQuery({
    queryKey: queryKeys.mentorAppointments.list,
    queryFn: fetchMentorAppointments,
  });
}
