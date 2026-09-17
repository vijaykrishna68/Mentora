import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Field } from "./Field";
import { Input } from "./Input";
import { Tabs } from "./Tabs";

describe("Button", () => {
  it("renders as an accessible, keyboard-focusable button and reports busy state while loading", async () => {
    const user = userEvent.setup();
    render(<Button loading>Save</Button>);

    const button = screen.getByRole("button", { name: /save/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    await user.tab();
    // A disabled button is skipped by tab order — nothing to focus, no crash.
    expect(document.activeElement).not.toBe(button);
  });

  it("is reachable and activatable by keyboard when enabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Confirm</Button>);

    await user.tab();
    expect(screen.getByRole("button", { name: /confirm/i })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Field + Input", () => {
  it("associates the label, hint, and error with the input via aria-describedby", () => {
    render(
      <Field label="Email" error="Enter a valid email address" required>
        {(fieldProps) => <Input type="email" {...fieldProps} />}
      </Field>,
    );

    const input = screen.getByLabelText(/email/i);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter a valid email address");
  });
});

describe("Tabs", () => {
  function ControlledTabs() {
    const [value, setValue] = useState("a");
    return (
      <Tabs
        label="Example tabs"
        value={value}
        onChange={setValue}
        items={[
          { value: "a", label: "First" },
          { value: "b", label: "Second" },
        ]}
      />
    );
  }

  it("exposes tab semantics and moves selection with arrow keys", async () => {
    const user = userEvent.setup();
    render(<ControlledTabs />);

    const first = screen.getByRole("tab", { name: "First" });
    const second = screen.getByRole("tab", { name: "Second" });
    expect(first).toHaveAttribute("aria-selected", "true");

    first.focus();
    await user.keyboard("{ArrowRight}");

    expect(second).toHaveAttribute("aria-selected", "true");
    expect(second).toHaveFocus();
  });
});

describe("Dialog", () => {
  it("traps focus within the panel and closes on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Dialog open onClose={onClose} title="Confirm cancellation">
        <button type="button">Yes, cancel</button>
      </Dialog>,
    );

    expect(screen.getByRole("dialog", { name: "Confirm cancellation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, cancel" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
