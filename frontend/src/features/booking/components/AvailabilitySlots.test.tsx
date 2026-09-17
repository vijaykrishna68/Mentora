import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AvailabilitySlot } from "@/types";
import { AvailabilitySlots } from "./AvailabilitySlots";

const baseProps = {
  durationMinutes: 45,
  selectedSlot: null,
  onSelectSlot: vi.fn(),
  onTryAnotherDate: vi.fn(),
  onRetry: vi.fn(),
};

function slot(startAt: string, category: AvailabilitySlot["category"]): AvailabilitySlot {
  const start = new Date(startAt);
  return { startAt, endAt: new Date(start.getTime() + 45 * 60_000).toISOString(), category };
}

describe("AvailabilitySlots", () => {
  it("shows a loading state", () => {
    render(<AvailabilitySlots {...baseProps} slots={[]} isPending isError={false} errorMessage={null} />);
    expect(screen.getByLabelText("Loading availability")).toBeInTheDocument();
  });

  it("shows a retryable error state without exposing a raw error code", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<AvailabilitySlots {...baseProps} slots={[]} isPending={false} isError errorMessage="Mentor not found." onRetry={onRetry} />);

    expect(screen.getByText("Couldn't load availability")).toBeInTheDocument();
    expect(screen.getByText("Mentor not found.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows a clear empty state with a way to try another date", async () => {
    const user = userEvent.setup();
    const onTryAnotherDate = vi.fn();
    render(<AvailabilitySlots {...baseProps} slots={[]} isPending={false} isError={false} errorMessage={null} onTryAnotherDate={onTryAnotherDate} />);

    expect(screen.getByText("No sessions available for this date.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try another date/i }));
    expect(onTryAnotherDate).toHaveBeenCalledTimes(1);
  });

  it("groups slots by the backend-provided category, in Morning/Afternoon/Evening order", () => {
    const slots = [
      slot("2026-03-09T22:00:00.000Z", "EVENING"),
      slot("2026-03-09T12:00:00.000Z", "MORNING"),
      slot("2026-03-09T16:00:00.000Z", "AFTERNOON"),
    ];
    render(<AvailabilitySlots {...baseProps} slots={slots} isPending={false} isError={false} errorMessage={null} />);

    const headings = screen.getAllByText(/Morning|Afternoon|Evening/).map((el) => el.textContent);
    expect(headings).toEqual(["Morning", "Afternoon", "Evening"]);
  });

  it("lets the user select a slot, and reflects the selection via aria-checked", async () => {
    const user = userEvent.setup();
    const onSelectSlot = vi.fn();
    const slots = [slot("2026-03-09T22:00:00.000Z", "EVENING")];
    render(<AvailabilitySlots {...baseProps} slots={slots} isPending={false} isError={false} errorMessage={null} onSelectSlot={onSelectSlot} />);

    const option = screen.getByRole("radio");
    expect(option).toHaveAttribute("aria-checked", "false");
    await user.click(option);
    expect(onSelectSlot).toHaveBeenCalledWith(slots[0]);
  });

  it("marks the currently selected slot as checked", () => {
    const slots = [slot("2026-03-09T22:00:00.000Z", "EVENING"), slot("2026-03-09T23:00:00.000Z", "EVENING")];
    render(<AvailabilitySlots {...baseProps} slots={slots} isPending={false} isError={false} errorMessage={null} selectedSlot={slots[0]!} />);

    const [first, second] = screen.getAllByRole("radio");
    expect(first).toHaveAttribute("aria-checked", "true");
    expect(second).toHaveAttribute("aria-checked", "false");
  });
});
