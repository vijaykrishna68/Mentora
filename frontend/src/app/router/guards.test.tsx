import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { SessionState } from "@/features/auth/useSession";

const mockUseSession = vi.fn<() => SessionState>();
vi.mock("@/features/auth/useSession", () => ({
  useSession: () => mockUseSession(),
}));

const { RequireAuth } = await import("@/features/auth/RequireAuth");
const { RequireRole } = await import("@/features/auth/RequireRole");
const { GuestOnly } = await import("@/features/auth/GuestOnly");

function renderAt(path: string, element: ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={element}>
          <Route path="/protected" element={<div>Protected content</div>} />
          <Route path="/mentor" element={<div>Mentor content</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/discover" element={<div>Discover page</div>} />
        <Route path="/mentor-home" element={<div>Mentor home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  it("redirects to /login when unauthenticated", () => {
    mockUseSession.mockReturnValue({ status: "unauthenticated", user: null });
    renderAt("/protected", <RequireAuth />);
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders the protected route when authenticated", () => {
    mockUseSession.mockReturnValue({
      status: "authenticated",
      user: { id: "1", email: "a@b.com", role: "CUSTOMER", name: "Ada", interests: [], createdAt: "", updatedAt: "" },
    });
    renderAt("/protected", <RequireAuth />);
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("shows a loader while the session is still resolving, not the login page or content", () => {
    mockUseSession.mockReturnValue({ status: "loading", user: null });
    renderAt("/protected", <RequireAuth />);
    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });
});

describe("RequireRole", () => {
  it("redirects a CUSTOMER away from a MENTOR-only route to their own home", () => {
    mockUseSession.mockReturnValue({
      status: "authenticated",
      user: { id: "1", email: "a@b.com", role: "CUSTOMER", name: "Ada", interests: [], createdAt: "", updatedAt: "" },
    });
    renderAt("/mentor", <RequireRole role="MENTOR" />);
    expect(screen.getByText("Discover page")).toBeInTheDocument();
  });

  it("renders the route when the role matches", () => {
    mockUseSession.mockReturnValue({
      status: "authenticated",
      user: { id: "2", email: "m@b.com", role: "MENTOR", name: "Grace", interests: [], createdAt: "", updatedAt: "" },
    });
    renderAt("/mentor", <RequireRole role="MENTOR" />);
    expect(screen.getByText("Mentor content")).toBeInTheDocument();
  });
});

describe("GuestOnly", () => {
  it("redirects an authenticated mentor away from a guest route", () => {
    mockUseSession.mockReturnValue({
      status: "authenticated",
      user: { id: "2", email: "m@b.com", role: "MENTOR", name: "Grace", interests: [], createdAt: "", updatedAt: "" },
    });
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<div>Login form</div>} />
          </Route>
          <Route path="/mentor-home" element={<div>Mentor home</div>} />
          <Route path="/discover" element={<div>Discover page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    // roleHomePath("MENTOR") is /mentor, not routed here — assert we left the guest route.
    expect(screen.queryByText("Login form")).not.toBeInTheDocument();
  });

  it("renders the guest route when unauthenticated", () => {
    mockUseSession.mockReturnValue({ status: "unauthenticated", user: null });
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<div>Login form</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Login form")).toBeInTheDocument();
  });
});
