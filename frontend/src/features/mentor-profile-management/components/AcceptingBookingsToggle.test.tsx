import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { useToastStore } from "@/lib/stores/toastStore";
import type { MentorReadiness } from "@/types";
import { AcceptingBookingsToggle } from "./AcceptingBookingsToggle";

vi.mock("../api", () => ({
  updateMyMentorProfile: vi.fn(),
}));

const { updateMyMentorProfile } = await import("../api");
const mockedUpdateMyMentorProfile = vi.mocked(updateMyMentorProfile);

function readiness(overrides: Partial<MentorReadiness> = {}): MentorReadiness {
  return {
    hasRequiredProfileInfo: true,
    hasTimezone: true,
    hasActiveOffering: true,
    hasActiveAvailabilityRule: true,
    acceptingBookings: true,
    readyExcludingAcceptingBookings: true,
    isBookable: true,
    reasons: [],
    ...overrides,
  };
}

function renderToggle(acceptingBookings: boolean, readinessOverrides: Partial<MentorReadiness> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AcceptingBookingsToggle acceptingBookings={acceptingBookings} readiness={readiness(readinessOverrides)} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedUpdateMyMentorProfile.mockReset();
  useToastStore.setState({ toasts: [] });
});

describe("AcceptingBookingsToggle", () => {
  it("turning it off sends only acceptingBookings:false and never implies existing appointments are affected", async () => {
    const user = userEvent.setup();
    mockedUpdateMyMentorProfile.mockResolvedValue({ profile: {} as never, readiness: readiness({ acceptingBookings: false }) });
    renderToggle(true);

    expect(screen.getByText(/existing appointments stay exactly as they are/i)).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: /accepting bookings/i }));

    await waitFor(() => expect(mockedUpdateMyMentorProfile).toHaveBeenCalledWith({ acceptingBookings: false }));
  });

  it("turning it on succeeds when the mentor is ready", async () => {
    const user = userEvent.setup();
    mockedUpdateMyMentorProfile.mockResolvedValue({ profile: {} as never, readiness: readiness({ acceptingBookings: true }) });
    renderToggle(false);

    await user.click(screen.getByRole("switch", { name: /accepting bookings/i }));

    await waitFor(() => expect(mockedUpdateMyMentorProfile).toHaveBeenCalledWith({ acceptingBookings: true }));
  });

  it("disables the switch and explains why when the mentor isn't ready yet", () => {
    renderToggle(false, { readyExcludingAcceptingBookings: false, hasActiveOffering: false });

    expect(screen.getByRole("switch", { name: /accepting bookings/i })).toBeDisabled();
    expect(screen.getByText(/finish the checklist above/i)).toBeInTheDocument();
    expect(mockedUpdateMyMentorProfile).not.toHaveBeenCalled();
  });

  it("surfaces the backend's ONBOARDING_INCOMPLETE message on a rejected enable attempt", async () => {
    const user = userEvent.setup();
    mockedUpdateMyMentorProfile.mockRejectedValue(
      new ApiError(400, "ONBOARDING_INCOMPLETE", "Cannot enable accepting bookings yet: Create at least one active offering."),
    );
    renderToggle(false);

    await user.click(screen.getByRole("switch", { name: /accepting bookings/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Cannot enable accepting bookings yet: Create at least one active offering.");
  });
});
