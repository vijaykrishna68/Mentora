import { apiRequest } from "@/lib/api/client";
import type {
  AvailabilityRule,
  AvailabilityRuleMutationResponse,
  CreateAvailabilityRuleInput,
  DeleteAvailabilityRuleResponse,
  UpdateAvailabilityRuleInput,
} from "@/types";

export function fetchMyAvailabilityRules(): Promise<{ rules: AvailabilityRule[] }> {
  return apiRequest("/mentor/availability");
}

export function createAvailabilityRule(input: CreateAvailabilityRuleInput): Promise<AvailabilityRuleMutationResponse> {
  return apiRequest("/mentor/availability", { method: "POST", body: input });
}

export function updateAvailabilityRule(id: string, input: UpdateAvailabilityRuleInput): Promise<AvailabilityRuleMutationResponse> {
  return apiRequest(`/mentor/availability/${id}`, { method: "PATCH", body: input });
}

export function deleteAvailabilityRule(id: string): Promise<DeleteAvailabilityRuleResponse> {
  return apiRequest(`/mentor/availability/${id}`, { method: "DELETE" });
}
