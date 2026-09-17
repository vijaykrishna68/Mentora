import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { MentorAppointmentListItem, MentorAppointmentsResponse } from "@/types";
import { MentorAppointmentsPage } from "./MentorAppointmentsPage";

vi.mock("./api", () => ({
  fetchMentorAppointments: vi.fn(),
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
        <MentorAppointmentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedFetchMentorAppointments.mockReset();
});

describe("MentorAppointmentsPage — loading and error", () => {
  it("shows a loading state while fetching", () => {
    mockedFetchMentorAppointments.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
  });

  it("shows a retryable error state, never a raw error code", async () => {
    mockedFetchMentorAppointments.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Something went wrong."));
    renderPage();

    expect(await screen.findByText("Couldn't load your appointments")).toBeInTheDocument();
    expect(screen.queryByText("INTERNAL_ERROR")).not.toBeInTheDocument();

    mockedFetchMentorAppointments.mockResolvedValue(response({ upcoming: [item()] }));
    await userEvent.setup().click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByText("Alex Kim")).toBeInTheDocument();
  });
});

describe("MentorAppointmentsPage — empty states", () => {
  it("shows an empty state for no upcoming appointments", async () => {
    mockedFetchMentorAppointments.mockResolvedValue(response());
    renderPage();
    expect(await screen.findByText("No upcoming sessions")).toBeInTheDocument();
  });

  it("shows an empty state for no past appointments", async () => {
    const user = userEvent.setup();
    mockedFetchMentorAppointments.mockResolvedValue(response());
    renderPage();

    await screen.findByText("No upcoming sessions");
    await user.click(screen.getByRole("tab", { name: "Past" }));

    expect(await screen.findByText("No past sessions")).toBeInTheDocument();
  });
});

describe("MentorAppointmentsPage — rendering", () => {
  it("renders upcoming appointments in the order the backend returns (already chronologically sorted)", async () => {
    mockedFetchMentorAppointments.mockResolvedValue(
      response({
        upcoming: [
          item({ id: "appt-early", customer: { id: "c1", name: "Alex Kim" }, startAt: "2026-03-09T22:00:00.000Z" }),
          item({ id: "appt-later", customer: { id: "c2", name: "Jordan Lee" }, startAt: "2026-03-10T15:00:00.000Z" }),
        ],
      }),
    );
    renderPage();

    await screen.findByText("Alex Kim");
    const names = screen.getAllByText(/Alex Kim|Jordan Lee/).map((el) => el.textContent);
    expect(names).toEqual(["Alex Kim", "Jordan Lee"]);
  });

  it("renders a cancelled appointment under the Past tab", async () => {
    const user = userEvent.setup();
    mockedFetchMentorAppointments.mockResolvedValue(response({ past: [item({ status: "CANCELLED" })] }));
    renderPage();

    await screen.findByText("No upcoming sessions");
    await user.click(screen.getByRole("tab", { name: "Past" }));

    expect(await screen.findByText("Alex Kim")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("keeps upcoming and past appointments in their respective tabs", async () => {
    const user = userEvent.setup();
    mockedFetchMentorAppointments.mockResolvedValue(
      response({
        upcoming: [item({ id: "appt-upcoming", customer: { id: "c1", name: "Alex Kim" } })],
        past: [item({ id: "appt-past", status: "COMPLETED", customer: { id: "c2", name: "Jordan Lee" } })],
      }),
    );
    renderPage();

    expect(await screen.findByText("Alex Kim")).toBeInTheDocument();
    expect(screen.queryByText("Jordan Lee")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Past" }));

    expect(await screen.findByText("Jordan Lee")).toBeInTheDocument();
    expect(screen.queryByText("Alex Kim")).not.toBeInTheDocument();
  });
});

describe("MentorAppointmentsPage — appointment detail dialog", () => {
  it("opens with the selected appointment's details and closes on request", async () => {
    const user = userEvent.setup();
    mockedFetchMentorAppointments.mockResolvedValue(response({ upcoming: [item()] }));
    renderPage();

    await user.click(await screen.findByRole("button", { name: /view details/i }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Alex Kim")).toBeInTheDocument();
    expect(within(dialog).getByText("Career Deep Dive")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
