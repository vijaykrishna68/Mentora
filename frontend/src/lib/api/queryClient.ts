import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "./errors";

// Client errors (4xx — bad input, unauthenticated, forbidden, conflict) are
// deterministic: retrying won't change the outcome, so only network drops
// and 5xx get a couple of retries.
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
});
