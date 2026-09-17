import type { ApiErrorBody } from "@/types";

/** Normalized shape for every failure the API client can produce. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error?: unknown }).error === "object" &&
    (value as { error?: unknown }).error !== null
  );
}

/** Builds an ApiError from a non-ok Response, tolerating a malformed/empty body. */
export async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (isApiErrorBody(body)) {
    const { code, message } = body.error;
    return new ApiError(response.status, code, message);
  }

  return new ApiError(response.status, "UNKNOWN_ERROR", response.statusText || "Something went wrong.");
}

export function networkError(): ApiError {
  return new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection.");
}
