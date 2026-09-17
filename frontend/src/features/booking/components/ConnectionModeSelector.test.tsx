import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConnectionModeSelector } from "./ConnectionModeSelector";

describe("ConnectionModeSelector", () => {
  it("only offers the modes it was given — the caller decides what's actually supported", () => {
    render(<ConnectionModeSelector modes={["GOOGLE_MEET", "PHONE"]} selected={null} onSelect={vi.fn()} />);

    expect(screen.getByRole("radio", { name: /google meet/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /phone/i })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /zoom/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /in person/i })).not.toBeInTheDocument();
  });

  it("lets the user pick a mode", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ConnectionModeSelector modes={["GOOGLE_MEET", "PHONE"]} selected={null} onSelect={onSelect} />);

    await user.click(screen.getByRole("radio", { name: /phone/i }));
    expect(onSelect).toHaveBeenCalledWith("PHONE");
  });

  it("marks the selected mode via aria-checked", () => {
    render(<ConnectionModeSelector modes={["GOOGLE_MEET", "PHONE"]} selected="PHONE" onSelect={vi.fn()} />);

    expect(screen.getByRole("radio", { name: /phone/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /google meet/i })).toHaveAttribute("aria-checked", "false");
  });

  it("shows a clear message when the offering has no connection mode configured", () => {
    render(<ConnectionModeSelector modes={[]} selected={null} onSelect={vi.fn()} />);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.getByText(/no connection mode configured/i)).toBeInTheDocument();
  });
});
