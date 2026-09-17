import { apiRequest } from "@/lib/api/client";
import type { Appointment, CreateAppointmentInput, PublicAvailabilityResponse } from "@/types";

export function fetchAvailability(mentorId: string, offeringId: string, date: string): Promise<PublicAvailabilityResponse> {
  const params = new URLSearchParams({ offeringId, date });
  return apiRequest(`/mentors/${mentorId}/availability?${params.toString()}`);
}

export function createAppointment(input: CreateAppointmentInput): Promise<{ appointment: Appointment }> {
  return apiRequest("/appointments", { method: "POST", body: input });
}
