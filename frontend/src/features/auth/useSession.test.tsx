import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { useSession } from "./useSession";

vi.mock("./api", () => ({
  fetchCurrentUser: vi.fn(),
}));

const { fetchCurrentUser } = await import("./api");
const mockedFetchCurrentUser = vi.mocked(fetchCurrentUser);

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useSession", () => {
  it("starts in the loading state before the /me request resolves", () => {
    mockedFetchCurrentUser.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current.status).toBe("loading");
    expect(result.current.user).toBeNull();
  });

  it("resolves to unauthenticated when /me rejects with 401", async () => {
    mockedFetchCurrentUser.mockRejectedValue(new ApiError(401, "UNAUTHENTICATED", "No session."));

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    expect(result.current.user).toBeNull();
  });

  it("resolves to authenticated with a CUSTOMER user", async () => {
    mockedFetchCurrentUser.mockResolvedValue({
      user: { id: "u1", email: "a@b.com", role: "CUSTOMER", name: "Ada", interests: [], createdAt: "", updatedAt: "" },
    });

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.user?.role).toBe("CUSTOMER");
  });

  it("resolves to authenticated with a MENTOR user", async () => {
    mockedFetchCurrentUser.mockResolvedValue({
      user: { id: "u2", email: "m@b.com", role: "MENTOR", name: "Grace", interests: [], createdAt: "", updatedAt: "" },
    });

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.user?.role).toBe("MENTOR");
  });
});
