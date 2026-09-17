import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { CustomerAppointmentListItem, CustomerAppointmentsResponse } from "@/types";
import { AppointmentsPage } from "./AppointmentsPage";

vi.mock("./api", () => ({
  fetchMyAppointments: vi.fn(),
}));

const { fetchMyAppointments } = await import("./api");
const mockedFetchMyAppointments = vi.mocked(fetchMyAppointments);

function item(overrides: Partial<CustomerAppointmentListItem> = {}): CustomerAppointmentListItem {
  return {
    id: "appt-1",
    mentor: { id: "mentor-1", name: "Priya Sharma", avatarUrl: null },
    offeringId: "offering-1",
    startAt: "2026-03-09T22:00:00.000Z",
    endAt: "2026-03-09T22:45:00.000Z",
    mentorTimezone: "America/New_York",
    connectionMode: "GOOGLE_MEET",
    connectionDetail: null,
    offeringSnapshot: { name: "Career Deep Dive", durationMinutes: 45, price: 400, currency: "INR" },
    status: "CONFIRMED",
    canReview: false,
    review: null,
    createdAt: "2026-03-01T00:00:00.000Z",
    ...overrides,
  };
}

function response(overrides: Partial<CustomerAppointmentsResponse> = {}): CustomerAppointmentsResponse {
  return { upcoming: [], past: [], ...overrides };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AppointmentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedFetchMyAppointments.mockReset();
});

describe("AppointmentsPage — loading and error", () => {
  it("shows a loading state while fetching", () => {
    mockedFetchMyAppointments.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
  });

  it("shows a retryable error state when the request fails", async () => {
    mockedFetchMyAppointments.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Something went wrong."));
    renderPage();

    expect(await screen.findByText("Couldn't load your appointments")).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: /try again/i });

    mockedFetchMyAppointments.mockResolvedValue(response({ upcoming: [item()] }));
    await userEvent.setup().click(retryButton);

    expect(await screen.findByText("Priya Sharma")).toBeInTheDocument();
  });
});

describe("AppointmentsPage — empty states", () => {
  it("shows an empty state with a call to action when there are no upcoming appointments", async () => {
    mockedFetchMyAppointments.mockResolvedValue(response());
    renderPage();

    expect(await screen.findByText("No upcoming appointments")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /find a mentor/i })).toHaveAttribute("href", "/discover");
  });

  it("shows an empty state for the past tab with no appointments", async () => {
    const user = userEvent.setup();
    mockedFetchMyAppointments.mockResolvedValue(response());
    renderPage();

    await screen.findByText("No upcoming appointments");
    await user.click(screen.getByRole("tab", { name: "Past" }));

    expect(await screen.findByText("No past appointments")).toBeInTheDocument();
  });
});

describe("AppointmentsPage — rendering appointments", () => {
  it("renders an upcoming appointment in the Upcoming tab", async () => {
    mockedFetchMyAppointments.mockResolvedValue(response({ upcoming: [item()] }));
    renderPage();

    expect(await screen.findByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute("aria-selected", "true");
  });

  it("renders a completed appointment under the Past tab", async () => {
    const user = userEvent.setup();
    mockedFetchMyAppointments.mockResolvedValue(response({ past: [item({ status: "COMPLETED", canReview: true })] }));
    renderPage();

    await screen.findByText("No upcoming appointments");
    await user.click(screen.getByRole("tab", { name: "Past" }));

    expect(await screen.findByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /leave a review/i })).toBeInTheDocument();
  });

  it("keeps upcoming and past appointments in their respective tabs", async () => {
    const user = userEvent.setup();
    mockedFetchMyAppointments.mockResolvedValue(
      response({
        upcoming: [item({ id: "appt-upcoming", mentor: { id: "mentor-1", name: "Priya Sharma", avatarUrl: null } })],
        past: [item({ id: "appt-past", status: "CANCELLED", mentor: { id: "mentor-2", name: "Jordan Lee", avatarUrl: null } })],
      }),
    );
    renderPage();

    expect(await screen.findByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.queryByText("Jordan Lee")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Past" }));

    expect(await screen.findByText("Jordan Lee")).toBeInTheDocument();
    expect(screen.queryByText("Priya Sharma")).not.toBeInTheDocument();
  });
});
