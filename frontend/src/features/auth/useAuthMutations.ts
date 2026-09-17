import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import * as authApi from "./api";
import type { LoginInput, RegisterInput } from "./schemas";

// Deliberately no mutation-level onSuccess here that writes the session
// cache. GuestOnly (wrapping /login and /signup) reacts to that cache the
// moment it changes; a data-router `navigate()` is a transition and
// resolves asynchronously, so if the cache write happens before that
// transition has actually finished, GuestOnly can still be mounted and
// wins the race with its own generic role-home redirect — a new mentor
// lands on the dashboard instead of onboarding, or a returning user
// doesn't land back on the page they were trying to reach. Callers must
// `await navigate(...)` before writing the cache (see LoginPage/SignupPage).
export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.auth.session });
    },
  });
}
