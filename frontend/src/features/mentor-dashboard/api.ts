import { apiRequest } from "@/lib/api/client";
import type { MentorAppointmentsResponse } from "@/types";

/** Ownership is derived from the authenticated session server-side — no mentor id is ever sent. */
export function fetchMentorAppointments(): Promise<MentorAppointmentsResponse> {
  return apiRequest("/mentor/appointments");
}
