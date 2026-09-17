import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import type { CreateExperienceInput, UpdateExperienceInput } from "@/types";
import { createExperience, deleteExperience, updateExperience } from "./api";

export function useCreateExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExperienceInput) => createExperience(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mentorProfileManagement.mine });
    },
  });
}

export function useUpdateExperience(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateExperienceInput) => updateExperience(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mentorProfileManagement.mine });
    },
  });
}

export function useDeleteExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExperience(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mentorProfileManagement.mine });
    },
  });
}
