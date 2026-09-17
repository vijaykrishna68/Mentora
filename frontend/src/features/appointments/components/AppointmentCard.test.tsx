import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { CustomerAppointmentListItem } from "@/types";
import { AppointmentCard } from "./AppointmentCard";

// Customer timezone is pinned so timezone-difference assertions don't depend on the host machine's real TZ.
vi.mock("@/lib/utils/datetime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils/datetime")>();
  return { ...actual, getBrowserTimezone: () => "Asia/Kolkata" };
});

// 22:00 UTC on 2026-03-09 — same fixed instant used by the booking test suite.
// In Asia/Kolkata (customer, pinned above): 2026-03-10, 3:30 AM.
// In America/New_York (mentor, EDT post-spring-forward): 2026-03-09, 6:00 PM.
const START_AT = "2026-03-09T22:00:00.000Z";

function appointment(overrides: Partial<CustomerAppointmentListItem> = {}): CustomerAppointmentListItem {
  return {
    id: "appt-1",
    mentor: { id: "mentor-1", name: "Priya Sharma", avatarUrl: null },
    offeringId: "offering-1",
    startAt: START_AT,
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

function renderCard(overrides: Partial<CustomerAppointmentListItem> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ul>
          <AppointmentCard appointment={appointment(overrides)} />
        </ul>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AppointmentCard — upcoming appointment", () => {
  it("renders mentor, offering snapshot, date/time, duration, connection mode, and status", () => {
    renderCard();

    expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByText("Career Deep Dive")).toBeInTheDocument();
    expect(screen.getByText(/45 min/)).toBeInTheDocument();
    expect(screen.getByText(/Google Meet/)).toBeInTheDocument();
    expect(screen.getByText("INR 400")).toBeInTheDocument();
    expect(screen.getByText("Tuesday, March 10, 2026")).toBeInTheDocument(); // customer-local date
    expect(screen.getByText("3:30 AM")).toBeInTheDocument();
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
  });

  it("shows a cancel action for a confirmed appointment", () => {
    renderCard({ status: "CONFIRMED" });
    expect(screen.getByRole("button", { name: /cancel session/i })).toBeInTheDocument();
  });

  it("shows both customer and mentor local time when their timezones differ", () => {
    renderCard();
    expect(screen.getByText("Your time")).toBeInTheDocument();
    expect(screen.getByText("Mentor's time")).toBeInTheDocument();
    expect(screen.getByText(/6:00 PM · America\/New_York/)).toBeInTheDocument();
  });

  it("does not show a mentor-time row when mentor and customer timezones are the same", () => {
    renderCard({ mentorTimezone: "Asia/Kolkata" });
    expect(screen.queryByText("Mentor's time")).not.toBeInTheDocument();
  });

  it("displays the connection detail for a PHONE booking", () => {
    renderCard({ connectionMode: "PHONE", connectionDetail: "+1-555-0199" });
    expect(screen.getByText(/\+1-555-0199/)).toBeInTheDocument();
  });
});

describe("AppointmentCard — completed appointment", () => {
  it("renders correctly and cannot be cancelled", () => {
    renderCard({ status: "COMPLETED", canReview: true });

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel session/i })).not.toBeInTheDocument();
  });

  it("shows a review action only when canReview is true", () => {
    renderCard({ status: "COMPLETED", canReview: true });
    expect(screen.getByRole("button", { name: /leave a review/i })).toBeInTheDocument();
  });

  it("does not show a review action when canReview is false", () => {
    renderCard({
      status: "COMPLETED",
      canReview: false,
      review: { id: "review-1", rating: 5, comment: "Great session!", createdAt: "2026-03-10T00:00:00.000Z" },
    });
    expect(screen.queryByRole("button", { name: /leave a review/i })).not.toBeInTheDocument();
  });

  it("displays an existing review's rating and comment", () => {
    renderCard({
      status: "COMPLETED",
      canReview: false,
      review: { id: "review-1", rating: 4, comment: "Really helpful.", createdAt: "2026-03-10T00:00:00.000Z" },
    });
    expect(screen.getByText("Your review")).toBeInTheDocument();
    expect(screen.getByLabelText("Rated 4 out of 5")).toBeInTheDocument();
    expect(screen.getByText("Really helpful.")).toBeInTheDocument();
  });

  it("keeps showing the historical offering snapshot rather than any current offering data", () => {
    // The snapshot is deliberately different from what a "current" offering
    // might look like — proving the card renders offeringSnapshot verbatim
    // and never fetches/merges live offering data.
    renderCard({
      status: "COMPLETED",
      offeringSnapshot: { name: "Legacy Offering Name", durationMinutes: 30, price: 250, currency: "USD" },
    });
    expect(screen.getByText("Legacy Offering Name")).toBeInTheDocument();
    expect(screen.getByText(/30 min/)).toBeInTheDocument();
    expect(screen.getByText("USD 250")).toBeInTheDocument();
  });
});

describe("AppointmentCard — cancelled appointment", () => {
  it("renders correctly with no cancel or review action", () => {
    renderCard({ status: "CANCELLED", canReview: false });

    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel session/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /leave a review/i })).not.toBeInTheDocument();
  });
});
