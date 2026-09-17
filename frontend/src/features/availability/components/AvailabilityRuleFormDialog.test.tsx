import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { AvailabilityRule, MentorReadiness } from "@/types";
import { AvailabilityRuleFormDialog } from "./AvailabilityRuleFormDialog";

vi.mock("../api", () => ({
  createAvailabilityRule: vi.fn(),
  updateAvailabilityRule: vi.fn(),
}));

const { createAvailabilityRule, updateAvailabilityRule } = await import("../api");
const mockedCreateAvailabilityRule = vi.mocked(createAvailabilityRule);
const mockedUpdateAvailabilityRule = vi.mocked(updateAvailabilityRule);

function readiness(): MentorReadiness {
  return {
    hasRequiredProfileInfo: true,
    hasTimezone: true,
    hasActiveOffering: true,
    hasActiveAvailabilityRule: true,
    acceptingBookings: true,
    readyExcludingAcceptingBookings: true,
    isBookable: true,
    reasons: [],
  };
}

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

function renderDialog(props: Partial<Parameters<typeof AvailabilityRuleFormDialog>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const onClose = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <AvailabilityRuleFormDialog open onClose={onClose} {...props} />
    </QueryClientProvider>,
  );
  return { ...utils, onClose };
}

beforeEach(() => {
  mockedCreateAvailabilityRule.mockReset();
  mockedUpdateAvailabilityRule.mockReset();
});

describe("AvailabilityRuleFormDialog — add", () => {
  it("creates a rule with the chosen day, times, and buffer", async () => {
    const user = userEvent.setup();
    mockedCreateAvailabilityRule.mockResolvedValue({ rule: rule(), readiness: readiness() });
    renderDialog();

    await user.selectOptions(screen.getByLabelText(/day/i), "TUESDAY");
    const bufferInput = screen.getByLabelText(/buffer/i);
    await user.clear(bufferInput);
    await user.type(bufferInput, "15");
    await user.click(screen.getByRole("button", { name: /add rule/i }));

    await waitFor(() => expect(mockedCreateAvailabilityRule).toHaveBeenCalledTimes(1));
    expect(mockedCreateAvailabilityRule).toHaveBeenCalledWith(
      expect.objectContaining({ dayOfWeek: "TUESDAY", startTime: "09:00", endTime: "17:00", bufferMinutes: 15 }),
    );
  });

  it("pre-selects the day passed in from the weekly view", () => {
    renderDialog({ defaultDayOfWeek: "FRIDAY" });
    expect(screen.getByLabelText(/day/i)).toHaveValue("FRIDAY");
  });
});

describe("AvailabilityRuleFormDialog — invalid time range", () => {
  it("rejects an end time before the start time without calling the backend", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.selectOptions(screen.getByLabelText(/day/i), "MONDAY");
    const startInput = screen.getByLabelText(/start time/i);
    await user.clear(startInput);
    await user.type(startInput, "18:00");
    const endInput = screen.getByLabelText(/end time/i);
    await user.clear(endInput);
    await user.type(endInput, "09:00");
    await user.click(screen.getByRole("button", { name: /add rule/i }));

    expect(await screen.findByText("Start time must be before end time")).toBeInTheDocument();
    expect(mockedCreateAvailabilityRule).not.toHaveBeenCalled();
  });
});

describe("AvailabilityRuleFormDialog — edit", () => {
  it("pre-fills from the existing rule and submits an update", async () => {
    const user = userEvent.setup();
    mockedUpdateAvailabilityRule.mockResolvedValue({ rule: rule({ startTime: "10:00" }), readiness: readiness() });
    renderDialog({ rule: rule() });

    expect(screen.getByLabelText(/day/i)).toHaveValue("MONDAY");
    expect(screen.getByLabelText(/start time/i)).toHaveValue("09:00");

    const startInput = screen.getByLabelText(/start time/i);
    await user.clear(startInput);
    await user.type(startInput, "10:00");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(mockedUpdateAvailabilityRule).toHaveBeenCalledWith("rule-1", expect.objectContaining({ startTime: "10:00" })));
  });
});

describe("AvailabilityRuleFormDialog — backend overlap conflict", () => {
  it("shows the backend's overlap message and keeps the form open for correction", async () => {
    const user = userEvent.setup();
    mockedCreateAvailabilityRule.mockRejectedValue(
      new ApiError(409, "AVAILABILITY_OVERLAP", "This time range overlaps with an existing availability rule on the same day."),
    );
    renderDialog();

    await user.selectOptions(screen.getByLabelText(/day/i), "MONDAY");
    await user.click(screen.getByRole("button", { name: /add rule/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This time range overlaps with an existing availability rule on the same day.");
    expect(screen.getByLabelText(/day/i)).toHaveValue("MONDAY");
    expect(screen.getByRole("button", { name: /add rule/i })).toBeEnabled();
  });
});
