import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { SessionState } from "@/features/auth/useSession";
import type { MentorAppointmentListItem, MentorAppointmentsResponse } from "@/types";
import { MentorDashboardPage } from "./MentorDashboardPage";

vi.mock("./api", () => ({
  fetchMentorAppointments: vi.fn(),
}));

const mockUseSession = vi.fn<() => SessionState>();
vi.mock("@/features/auth/useSession", () => ({
  useSession: () => mockUseSession(),
}));

const { fetchMentorAppointments } = await import("./api");
const mockedFetchMentorAppointments = vi.mocked(fetchMentorAppointments);

function item(overrides: Partial<MentorAppointmentListItem> = {}): MentorAppointmentListItem {
  return {
    id: "appt-1",
    customer: { id: "customer-1", name: "Alex Kim" },
    offeringId: "offering-1",
    startAt: "2026-03-09T22:00:00.000Z",
    endAt: "2026-03-09T22:45:00.000Z",
    mentorTimezone: "America/New_York",
    connectionMode: "GOOGLE_MEET",
    connectionDetail: null,
    offeringSnapshot: { name: "Career Deep Dive", durationMinutes: 45, price: 400, currency: "INR" },
    status: "CONFIRMED",
    review: null,
    createdAt: "2026-03-01T00:00:00.000Z",
    ...overrides,
  };
}

function response(overrides: Partial<MentorAppointmentsResponse> = {}): MentorAppointmentsResponse {
  return { upcoming: [], past: [], ...overrides };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MentorDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedFetchMentorAppointments.mockReset();
  mockUseSession.mockReturnValue({
    status: "authenticated",
    user: { id: "mentor-1", email: "priya@example.com", role: "MENTOR", name: "Priya Sharma", interests: [], createdAt: "", updatedAt: "" },
  });
});

describe("MentorDashboardPage — loading", () => {
  it("shows a skeleton while fetching", () => {
    mockedFetchMentorAppointments.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.queryByText("Welcome back, Priya Sharma")).not.toBeInTheDocument();
  });
});

describe("MentorDashboardPage — with upcoming appointments", () => {
  it("greets the mentor and lists upcoming sessions with a summary count", async () => {
    mockedFetchMentorAppointments.mockResolvedValue(response({ upcoming: [item()], past: [item({ id: "appt-2", status: "COMPLETED" })] }));
    renderPage();

    expect(await screen.findByText("Welcome back, Priya Sharma")).toBeInTheDocument();
    expect(screen.getByText("Alex Kim")).toBeInTheDocument();

    const upcomingStat = screen.getByText("Upcoming sessions", { selector: "p" }).closest("div");
    expect(upcomingStat && within(upcomingStat).getByText("1")).toBeInTheDocument();
    const completedStat = screen.getByText("Completed sessions", { selector: "p" }).closest("div");
    expect(completedStat && within(completedStat).getByText("1")).toBeInTheDocument();
  });

  it("opens the appointment detail dialog from the dashboard", async () => {
    const user = userEvent.setup();
    mockedFetchMentorAppointments.mockResolvedValue(response({ upcoming: [item()] }));
    renderPage();

    await user.click(await screen.findByRole("button", { name: /view details/i }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Alex Kim");
  });
});

describe("MentorDashboardPage — no upcoming appointments", () => {
  it("shows a useful empty state", async () => {
    mockedFetchMentorAppointments.mockResolvedValue(response());
    renderPage();

    expect(await screen.findByText("No upcoming sessions")).toBeInTheDocument();
  });
});

describe("MentorDashboardPage — error", () => {
  it("shows a friendly retryable error, never a raw error code", async () => {
    mockedFetchMentorAppointments.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Something went wrong."));
    renderPage();

    const errorState = await screen.findByText("Couldn't load your dashboard");
    expect(errorState).toBeInTheDocument();
    expect(screen.queryByText("INTERNAL_ERROR")).not.toBeInTheDocument();

    mockedFetchMentorAppointments.mockResolvedValue(response({ upcoming: [item()] }));
    await userEvent.setup().click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByText("Alex Kim")).toBeInTheDocument();
  });
});
