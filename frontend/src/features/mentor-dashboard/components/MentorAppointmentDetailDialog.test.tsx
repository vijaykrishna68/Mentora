import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { MentorAppointmentListItem } from "@/types";
import { MentorAppointmentDetailDialog } from "./MentorAppointmentDetailDialog";

const START_AT = "2026-03-09T22:00:00.000Z"; // 6:00 PM in America/New_York

function appointment(overrides: Partial<MentorAppointmentListItem> = {}): MentorAppointmentListItem {
  return {
    id: "appt-1",
    customer: { id: "customer-1", name: "Alex Kim" },
    offeringId: "offering-1",
    startAt: START_AT,
    endAt: "2026-03-09T22:45:00.000Z",
    mentorTimezone: "America/New_York",
    connectionMode: "PHONE",
    connectionDetail: "+1-555-0199",
    offeringSnapshot: { name: "Career Deep Dive", durationMinutes: 45, price: 400, currency: "INR" },
    status: "CONFIRMED",
    review: null,
    createdAt: "2026-03-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("MentorAppointmentDetailDialog", () => {
  it("renders nothing when no appointment is selected", () => {
    render(<MentorAppointmentDetailDialog appointment={null} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens with the customer, offering snapshot, duration, price, date/time, connection mode, connection detail, and status", () => {
    render(<MentorAppointmentDetailDialog appointment={appointment()} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Alex Kim");
    expect(dialog).toHaveTextContent("Career Deep Dive");
    expect(dialog).toHaveTextContent("45 min");
    expect(dialog).toHaveTextContent("INR 400");
    expect(dialog).toHaveTextContent("Monday, March 9, 2026");
    expect(dialog).toHaveTextContent("6:00 PM");
    expect(dialog).toHaveTextContent("America/New_York");
    expect(dialog).toHaveTextContent("Phone");
    expect(dialog).toHaveTextContent("+1-555-0199");
    expect(dialog).toHaveTextContent("Upcoming");
  });

  it("does not expose the raw appointment or customer id", () => {
    render(<MentorAppointmentDetailDialog appointment={appointment()} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toHaveTextContent("appt-1");
    expect(dialog).not.toHaveTextContent("customer-1");
  });

  it("never fabricates a Google Meet link, showing the honest fallback instead", () => {
    render(<MentorAppointmentDetailDialog appointment={appointment({ connectionMode: "GOOGLE_MEET", connectionDetail: null })} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toHaveTextContent(/meet\.google\.com/i);
    expect(dialog).toHaveTextContent(/link available once meeting integration is added/i);
  });

  it("shows an honest fallback for a missing PHONE detail rather than fabricating one", () => {
    render(<MentorAppointmentDetailDialog appointment={appointment({ connectionMode: "PHONE", connectionDetail: null })} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("No phone number on file");
  });

  it("shows a cancelled appointment's status", () => {
    render(<MentorAppointmentDetailDialog appointment={appointment({ status: "CANCELLED" })} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("Cancelled");
  });

  it("calls onClose on Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    function Harness() {
      return (
        <>
          <button>Open trigger</button>
          <MentorAppointmentDetailDialog appointment={appointment()} onClose={onClose} />
        </>
      );
    }
    render(<Harness />);

    const trigger = screen.getByRole("button", { name: "Open trigger" });
    trigger.focus();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the caller sets appointment to null", () => {
    const { rerender } = render(<MentorAppointmentDetailDialog appointment={appointment()} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    rerender(<MentorAppointmentDetailDialog appointment={null} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
