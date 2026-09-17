import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AvailabilityRule } from "@/types";
import { WeeklyScheduleView } from "./WeeklyScheduleView";

function rule(overrides: Partial<AvailabilityRule> = {}): AvailabilityRule {
  return {
    id: "rule-1",
    mentorProfileId: "mentor-1",
    dayOfWeek: "MONDAY",
    startTime: "09:00",
    endTime: "12:00",
    bufferMinutes: 10,
    isActive: true,
    ...overrides,
  };
}

describe("WeeklyScheduleView", () => {
  it("groups rules under their own day and shows 'No availability' for empty days", () => {
    render(
      <WeeklyScheduleView
        rules={[rule(), rule({ id: "rule-2", dayOfWeek: "MONDAY", startTime: "18:00", endTime: "21:00" })]}
        onAddForDay={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const mondayRow = screen.getByText("Monday").closest("div");
    expect(mondayRow && within(mondayRow).getByText("09:00 — 12:00")).toBeInTheDocument();
    expect(mondayRow && within(mondayRow).getByText("18:00 — 21:00")).toBeInTheDocument();

    const tuesdayRow = screen.getByText("Tuesday").closest("div");
    expect(tuesdayRow && within(tuesdayRow).getByText("No availability")).toBeInTheDocument();
  });

  it("shows every day as empty when there are no rules at all", () => {
    render(<WeeklyScheduleView rules={[]} onAddForDay={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getAllByText("No availability")).toHaveLength(7);
  });

  it("shows the buffer and active status per rule", () => {
    render(<WeeklyScheduleView rules={[rule()]} onAddForDay={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("10 min buffer")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("calls onAddForDay with the correct day", async () => {
    const user = userEvent.setup();
    const onAddForDay = vi.fn();
    render(<WeeklyScheduleView rules={[]} onAddForDay={onAddForDay} onEdit={vi.fn()} onDelete={vi.fn()} />);

    const wednesdayRow = screen.getByText("Wednesday").closest("div") as HTMLElement;
    await user.click(within(wednesdayRow).getByRole("button", { name: /add/i }));

    expect(onAddForDay).toHaveBeenCalledWith("WEDNESDAY");
  });

  it("calls onEdit and onDelete for the clicked rule", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const theRule = rule();
    render(<WeeklyScheduleView rules={[theRule]} onAddForDay={vi.fn()} onEdit={onEdit} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(theRule);

    await user.click(screen.getByRole("button", { name: /remove/i }));
    expect(onDelete).toHaveBeenCalledWith(theRule);
  });
});
