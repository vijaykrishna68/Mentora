import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastViewport } from "@/components/ui";
import { ApiError } from "@/lib/api/errors";
import { useToastStore } from "@/lib/stores/toastStore";
import type { Appointment, PublicOffering } from "@/types";
import { BookingPanel } from "./BookingPanel";

// A true end-to-end pass through BookingPanel + AvailabilitySlots + BookingDialog
// together (nothing mocked except the two network calls), specifically for the
// 409 conflict path — the phase calls this out as the most important
// reliability behavior, so it gets its own integration test on top of each
// component's isolated unit tests.
vi.mock("../api", () => ({
  fetchAvailability: vi.fn(),
  createAppointment: vi.fn(),
}));

const { fetchAvailability, createAppointment } = await import("../api");
const mockedFetchAvailability = vi.mocked(fetchAvailability);
const mockedCreateAppointment = vi.mocked(createAppointment);

const offering: PublicOffering = {
  id: "offering-1",
  name: "Career Deep Dive",
  description: null,
  category: "CAREER_GROWTH",
  durationMinutes: 45,
  price: 400,
  currency: "INR",
  connectionModes: ["GOOGLE_MEET"],
  availabilityCategories: ["EVENING"],
};

const SLOT = { startAt: "2026-03-09T22:00:00.000Z", endAt: "2026-03-09T22:45:00.000Z", category: "EVENING" as const };

function renderFlow() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BookingPanel mentorId="mentor-1" mentorName="Priya Sharma" mentorConnectionModes={["GOOGLE_MEET"]} selectedOffering={offering} />
        <ToastViewport />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedFetchAvailability.mockReset();
  mockedCreateAppointment.mockReset();
  useToastStore.setState({ toasts: [] });
  mockedFetchAvailability.mockResolvedValue({
    mentorId: "mentor-1",
    offeringId: "offering-1",
    date: "2026-03-09",
    timezone: "America/New_York",
    slots: [SLOT],
  });
});

describe("Booking flow — 409 conflict end to end", () => {
  it("clears the stale slot and lets the user pick another after someone else books it first", async () => {
    const user = userEvent.setup();
    mockedCreateAppointment.mockRejectedValue(new ApiError(409, "SLOT_UNAVAILABLE", "That slot was just booked."));
    renderFlow();

    // Select the date → wait for slots to load → select the only slot (also auto-selects the sole connection mode).
    const dateGroup = screen.getByRole("radiogroup", { name: /select a date/i });
    await user.click(dateGroup.querySelectorAll('[role="radio"]')[0] as HTMLElement);

    const slotButton = await screen.findByRole("radio", { name: /(AM|PM)/i });
    await user.click(slotButton);
    expect(slotButton).toHaveAttribute("aria-checked", "true");

    // Open the review dialog and confirm.
    await user.click(screen.getByRole("button", { name: /confirm booking/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Confirm booking" }));

    // The required conflict copy appears, using the actual selected time.
    expect(await screen.findByText("That slot was just booked.")).toBeInTheDocument();
    expect(screen.getByText(/is no longer available\. Choose another time to continue\./)).toBeInTheDocument();

    // The dialog is gone, availability was refetched, and the slot is no longer selected.
    await waitFor(() => expect(mockedFetchAvailability).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select a time" })).toBeInTheDocument();

    // Mentor and offering context survive the conflict — the date strip and slot grid are both still there to pick from again.
    expect(screen.getByRole("radiogroup", { name: /select a date/i })).toBeInTheDocument();
    expect(await screen.findByRole("radio", { name: /(AM|PM)/i })).toHaveAttribute("aria-checked", "false");
  });
});

describe("Booking flow — successful booking end to end", () => {
  it("shows the success view (not an immediately-unmounted dialog) and clears the booked slot behind it", async () => {
    const user = userEvent.setup();
    const bookedAppointment: Appointment = {
      id: "appt-1",
      mentorId: "mentor-1",
      offeringId: "offering-1",
      customerId: "customer-1",
      startAt: SLOT.startAt,
      endAt: SLOT.endAt,
      status: "CONFIRMED",
      connectionMode: "GOOGLE_MEET",
      connectionDetail: null,
      mentorTimezone: "America/New_York",
      offeringSnapshot: { name: offering.name, durationMinutes: offering.durationMinutes, price: offering.price, currency: offering.currency },
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    };
    mockedCreateAppointment.mockResolvedValue({ appointment: bookedAppointment });
    renderFlow();

    const dateGroup = screen.getByRole("radiogroup", { name: /select a date/i });
    await user.click(dateGroup.querySelectorAll('[role="radio"]')[0] as HTMLElement);
    const slotButton = await screen.findByRole("radio", { name: /(AM|PM)/i });
    await user.click(slotButton);

    await user.click(screen.getByRole("button", { name: /confirm booking/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Confirm booking" }));

    // The success view actually renders — this is the exact regression a
    // premature `selectedSlot` reset caused: clearing the slot unmounted
    // the dialog (its render was gated on a selected slot) before the
    // success content ever appeared.
    expect(await within(dialog).findByText("Booking confirmed")).toBeInTheDocument();

    // Behind the (still-open) success dialog, the slot grid no longer shows the booked slot as selected.
    expect(screen.getByRole("radio", { name: /(AM|PM)/i })).toHaveAttribute("aria-checked", "false");
  });
});
