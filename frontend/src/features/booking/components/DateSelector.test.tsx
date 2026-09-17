import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { toDateKey } from "@/lib/utils/datetime";
import { DateSelector } from "./DateSelector";

describe("DateSelector", () => {
  it("starts at today — there are no past dates to disable because none are rendered", () => {
    render(<DateSelector selectedDate={null} onSelectDate={vi.fn()} />);
    const options = screen.getAllByRole("radio");
    const todayDay = toDateKey(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone).slice(-2).replace(/^0/, "");
    // The first (and therefore earliest) pill is today — nothing earlier is rendered at all.
    expect(options[0]).toHaveTextContent(todayDay);
    expect(options.length).toBeGreaterThan(1);
  });

  it("selects a date on click", async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();
    render(<DateSelector selectedDate={null} onSelectDate={onSelectDate} />);

    const first = screen.getAllByRole("radio")[0]!;
    await user.click(first);
    expect(onSelectDate).toHaveBeenCalledTimes(1);
  });

  it("marks the selected date with aria-checked, not color alone", () => {
    const todayKey = toDateKey(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
    render(<DateSelector selectedDate={todayKey} onSelectDate={vi.fn()} />);

    const options = screen.getAllByRole("radio");
    expect(options[0]).toHaveAttribute("aria-checked", "true");
    expect(options[1]).toHaveAttribute("aria-checked", "false");
  });

  it("moves selection with the right arrow key", async () => {
    const user = userEvent.setup();
    const todayKey = toDateKey(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
    const onSelectDate = vi.fn();
    render(<DateSelector selectedDate={todayKey} onSelectDate={onSelectDate} />);

    screen.getAllByRole("radio")[0]!.focus();
    await user.keyboard("{ArrowRight}");

    expect(onSelectDate).toHaveBeenCalledTimes(1);
    expect(onSelectDate).not.toHaveBeenCalledWith(todayKey);
  });
});
