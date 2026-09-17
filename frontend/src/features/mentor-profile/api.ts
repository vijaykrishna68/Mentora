import { apiRequest } from "@/lib/api/client";
import type { PublicMentorDetail } from "@/types";

export function fetchMentorProfile(mentorId: string): Promise<{ mentor: PublicMentorDetail }> {
  return apiRequest(`/mentors/${mentorId}`);
}
