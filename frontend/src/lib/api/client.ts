import type { ApiSuccessBody } from "@/types";
import { API_URL } from "./config";
import { ApiError, networkError, toApiError } from "./errors";

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

const REFRESH_PATH = "/auth/refresh";

// Dedupes concurrent 401s into a single refresh call instead of firing one
// refresh request per failed query/mutation.
let refreshPromise: Promise<boolean> | null = null;

async function rawFetch(path: string, options: RequestOptions): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });
}

function attemptRefresh(): Promise<boolean> {
  refreshPromise ??= rawFetch(REFRESH_PATH, { method: "POST" })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

/**
 * Centralized API client. Unwraps the `{ data }` envelope, normalizes
 * `{ error }` failures into ApiError, and — on a 401 from anything other
 * than the refresh call itself — attempts exactly one silent refresh before
 * retrying the original request once. Never stores or inspects tokens: the
 * browser handles the HTTP-only cookies entirely.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  let response: Response;
  try {
    response = await rawFetch(path, options);
  } catch {
    throw networkError();
  }

  if (response.ok) {
    if (response.status === 204) {
      return undefined as T;
    }
    const body = (await response.json()) as ApiSuccessBody<T>;
    return body.data;
  }

  if (response.status === 401 && !isRetry && path !== REFRESH_PATH) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      return apiRequest<T>(path, options, true);
    }
  }

  throw await toApiError(response);
}

export { ApiError };
