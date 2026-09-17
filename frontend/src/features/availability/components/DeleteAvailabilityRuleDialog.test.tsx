import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { AvailabilityRule, MentorReadiness } from "@/types";
import { DeleteAvailabilityRuleDialog } from "./DeleteAvailabilityRuleDialog";

vi.mock("../api", () => ({
  deleteAvailabilityRule: vi.fn(),
}));

const { deleteAvailabilityRule } = await import("../api");
const mockedDeleteAvailabilityRule = vi.mocked(deleteAvailabilityRule);

function readiness(): MentorReadiness {
  return {
    hasRequiredProfileInfo: true,
    hasTimezone: true,
    hasActiveOffering: true,
    hasActiveAvailabilityRule: false,
    acceptingBookings: true,
    readyExcludingAcceptingBookings: false,
    isBookable: false,
    reasons: ["Add at least one active availability rule."],
  };
}

const rule: AvailabilityRule = {
  id: "rule-1",
  mentorProfileId: "mentor-1",
  dayOfWeek: "MONDAY",
  startTime: "09:00",
  endTime: "12:00",
  bufferMinutes: 0,
  isActive: true,
};

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const onClose = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <DeleteAvailabilityRuleDialog open onClose={onClose} rule={rule} />
    </QueryClientProvider>,
  );
  return { ...utils, onClose };
}

beforeEach(() => {
  mockedDeleteAvailabilityRule.mockReset();
});

describe("DeleteAvailabilityRuleDialog", () => {
  it("asks for confirmation before deleting", () => {
    renderDialog();
    expect(screen.getByText("Remove this availability rule?")).toBeInTheDocument();
    expect(screen.getByText(/Monday, 09:00–12:00/)).toBeInTheDocument();
    expect(mockedDeleteAvailabilityRule).not.toHaveBeenCalled();
  });

  it("deletes on confirmation and reports success", async () => {
    const user = userEvent.setup();
    mockedDeleteAvailabilityRule.mockResolvedValue({ readiness: readiness() });
    const { onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: /remove rule/i }));

    await waitFor(() => expect(mockedDeleteAvailabilityRule).toHaveBeenCalledWith("rule-1"));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("shows a friendly error and keeps the dialog open on failure", async () => {
    const user = userEvent.setup();
    mockedDeleteAvailabilityRule.mockRejectedValue(new ApiError(404, "AVAILABILITY_RULE_NOT_FOUND", "Availability rule not found."));
    const { onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: /remove rule/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Availability rule not found.");
    expect(onClose).not.toHaveBeenCalled();
  });
});
