import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MentorAppointmentListItem } from "@/types";
import { MentorAppointmentCard } from "./MentorAppointmentCard";

// 22:00 UTC on 2026-03-09 — 6:00 PM in America/New_York (mentor's stored
// scheduling timezone, EDT post-spring-forward), 3:30 AM the next day in
// Asia/Kolkata. The card must show the America/New_York time regardless of
// which of these the test environment's "browser" timezone happens to be.
const START_AT = "2026-03-09T22:00:00.000Z";

function appointment(overrides: Partial<MentorAppointmentListItem> = {}): MentorAppointmentListItem {
  return {
    id: "appt-1",
    customer: { id: "customer-1", name: "Alex Kim" },
    offeringId: "offering-1",
    startAt: START_AT,
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

function renderCard(overrides: Partial<MentorAppointmentListItem> = {}) {
  const onViewDetails = vi.fn();
  const utils = render(<ul><MentorAppointmentCard appointment={appointment(overrides)} onViewDetails={onViewDetails} /></ul>);
  return { ...utils, onViewDetails };
}

describe("MentorAppointmentCard", () => {
  it("renders customer, offering, duration, connection mode, and effective status", () => {
    renderCard();

    expect(screen.getByText("Alex Kim")).toBeInTheDocument();
    expect(screen.getByText("Career Deep Dive")).toBeInTheDocument();
    expect(screen.getByText(/45 min/)).toBeInTheDocument();
    expect(screen.getByText(/Google Meet/)).toBeInTheDocument();
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
  });

  it("shows the appointment's stored mentor timezone, not the browser's", () => {
    renderCard();
    // America/New_York at this instant is 6:00 PM — never 3:30 AM (Asia/Kolkata)
    // or any offset derived from the test runner's own local timezone.
    expect(screen.getByText("6:00 PM")).toBeInTheDocument();
  });

  it("shows a completed appointment's status", () => {
    renderCard({ status: "COMPLETED" });
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows a cancelled appointment's status", () => {
    renderCard({ status: "CANCELLED" });
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("displays the PHONE connection detail when present", () => {
    renderCard({ connectionMode: "PHONE", connectionDetail: "+1-555-0199" });
    expect(screen.getByText("+1-555-0199")).toBeInTheDocument();
  });

  it("never fabricates a Google Meet link when connectionDetail is null", () => {
    renderCard({ connectionMode: "GOOGLE_MEET", connectionDetail: null });
    expect(screen.queryByText(/meet\.google\.com/i)).not.toBeInTheDocument();
    expect(screen.getByText(/link available once meeting integration is added/i)).toBeInTheDocument();
  });

  it("keeps showing the historical offering snapshot", () => {
    renderCard({ offeringSnapshot: { name: "Legacy Offering Name", durationMinutes: 30, price: 250, currency: "USD" } });
    expect(screen.getByText("Legacy Offering Name")).toBeInTheDocument();
    expect(screen.getByText(/30 min/)).toBeInTheDocument();
  });

  it("calls onViewDetails when its action is clicked", async () => {
    const { onViewDetails } = renderCard();
    screen.getByRole("button", { name: /view details/i }).click();
    expect(onViewDetails).toHaveBeenCalledTimes(1);
  });
});
