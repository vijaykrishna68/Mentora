import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { ApiError } from "./errors";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("unwraps the { data } envelope on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { data: { id: "1", name: "Ada" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiRequest<{ id: string; name: string }>("/widgets/1");

    expect(result).toEqual({ id: "1", name: "Ada" });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/widgets/1"),
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("normalizes a { error } response into ApiError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(409, { error: { code: "SLOT_UNAVAILABLE", message: "That slot was just booked." } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/appointments")).rejects.toMatchObject({
      status: 409,
      code: "SLOT_UNAVAILABLE",
      message: "That slot was just booked.",
    });
  });

  it("normalizes a network failure into an ApiError instead of throwing raw", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    const error = await apiRequest("/anything").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("NETWORK_ERROR");
  });

  it("retries exactly once after a successful silent refresh, then returns the retried result", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/auth/refresh")) return Promise.resolve(jsonResponse(200, { data: { success: true } }));
      if (fetchMock.mock.calls.filter((c: unknown[]) => (c[0] as string).includes("/me")).length === 1) {
        return Promise.resolve(jsonResponse(401, { error: { code: "UNAUTHENTICATED", message: "No session." } }));
      }
      return Promise.resolve(jsonResponse(200, { data: { user: { id: "u1" } } }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiRequest<{ user: { id: string } }>("/auth/me");

    expect(result).toEqual({ user: { id: "u1" } });
    // /auth/me (401) → /auth/refresh (200) → /auth/me (200): exactly 3 calls, never more.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not loop indefinitely when refresh fails, or when the retried request 401s again", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/auth/refresh")) {
        return Promise.resolve(jsonResponse(401, { error: { code: "INVALID_REFRESH_TOKEN", message: "Expired." } }));
      }
      return Promise.resolve(jsonResponse(401, { error: { code: "UNAUTHENTICATED", message: "No session." } }));
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/auth/me")).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
    // /auth/me (401) → /auth/refresh (401, refresh itself fails) → stop. No retry attempted.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never attempts to refresh when the refresh endpoint itself is the one 401ing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401, { error: { code: "INVALID_REFRESH_TOKEN", message: "Expired." } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/auth/refresh", { method: "POST" })).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
