import { apiRequest } from "@/lib/api/client";
import type { Appointment, CreateReviewInput, CustomerAppointmentsResponse, Review } from "@/types";

export function fetchMyAppointments(): Promise<CustomerAppointmentsResponse> {
  return apiRequest("/appointments");
}

export function cancelAppointment(appointmentId: string): Promise<{ appointment: Appointment }> {
  return apiRequest(`/appointments/${appointmentId}/cancel`, { method: "PATCH" });
}

export function submitReview(appointmentId: string, input: CreateReviewInput): Promise<{ review: Review }> {
  return apiRequest(`/appointments/${appointmentId}/review`, { method: "POST", body: input });
}
