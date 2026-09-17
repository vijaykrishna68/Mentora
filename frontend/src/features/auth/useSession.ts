import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import { isApiError } from "@/lib/api/errors";
import type { User } from "@/types";
import { fetchCurrentUser } from "./api";

export type SessionState =
  | { status: "loading"; user: null }
  | { status: "unauthenticated"; user: null }
  | { status: "authenticated"; user: User };

/**
 * The single source of truth for "who is logged in." Backed by
 * GET /api/auth/me — never by decoding the JWT, which the frontend never
 * even sees (it lives in an HTTP-only cookie).
 */
export function useSession(): SessionState {
  const query = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: fetchCurrentUser,
    retry: (failureCount, error) => {
      // A 401 here means "not logged in," not a transient failure — the
      // api client has already tried a refresh before this ever surfaces.
      if (isApiError(error) && error.status === 401) return false;
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (query.isPending) {
    return { status: "loading", user: null };
  }

  if (query.isError) {
    return { status: "unauthenticated", user: null };
  }

  return { status: "authenticated", user: query.data.user };
}
