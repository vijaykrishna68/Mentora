import { apiRequest } from "@/lib/api/client";
import type {
  CreateExperienceInput,
  ExperienceEntry,
  GetMyMentorProfileResponse,
  UpdateExperienceInput,
  UpdateMentorProfileInput,
  UpdateMentorProfileResponse,
} from "@/types";

export function fetchMyMentorProfile(): Promise<GetMyMentorProfileResponse> {
  return apiRequest("/mentor/profile");
}

export function updateMyMentorProfile(input: UpdateMentorProfileInput): Promise<UpdateMentorProfileResponse> {
  return apiRequest("/mentor/profile", { method: "PATCH", body: input });
}

export function createExperience(input: CreateExperienceInput): Promise<{ experienceEntry: ExperienceEntry }> {
  return apiRequest("/mentor/experience", { method: "POST", body: input });
}

export function updateExperience(id: string, input: UpdateExperienceInput): Promise<{ experienceEntry: ExperienceEntry }> {
  return apiRequest(`/mentor/experience/${id}`, { method: "PATCH", body: input });
}

export function deleteExperience(id: string): Promise<{ success: boolean }> {
  return apiRequest(`/mentor/experience/${id}`, { method: "DELETE" });
}
