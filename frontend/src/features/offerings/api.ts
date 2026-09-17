import { apiRequest } from "@/lib/api/client";
import type { CreateOfferingInput, DeleteOfferingResponse, Offering, OfferingMutationResponse, UpdateOfferingInput } from "@/types";

export function fetchMyOfferings(): Promise<{ offerings: Offering[] }> {
  return apiRequest("/mentor/offerings");
}

export function createOffering(input: CreateOfferingInput): Promise<OfferingMutationResponse> {
  return apiRequest("/mentor/offerings", { method: "POST", body: input });
}

export function updateOffering(id: string, input: UpdateOfferingInput): Promise<OfferingMutationResponse> {
  return apiRequest(`/mentor/offerings/${id}`, { method: "PATCH", body: input });
}

export function deleteOffering(id: string): Promise<DeleteOfferingResponse> {
  return apiRequest(`/mentor/offerings/${id}`, { method: "DELETE" });
}
