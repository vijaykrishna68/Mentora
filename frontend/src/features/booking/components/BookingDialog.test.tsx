import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastViewport } from "@/components/ui";
import { ApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/queryKeys";
import { useToastStore } from "@/lib/stores/toastStore";
import type { Appointment, AvailabilitySlot, PublicOffering } from "@/types";
import { BookingDialog } from "./BookingDialog";

vi.mock("../api", () => ({
  createAppointment: vi.fn(),
}));
// Customer timezone is pinned so the "different timezone" assertions don't depend on the host machine's real TZ.
vi.mock("@/lib/utils/datetime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils/datetime")>();
  return { ...actual, getBrowserTimezone: () => "Asia/Kolkata" };
});

const { createAppointment } = await import("../api");
const mockedCreateAppointment = vi.mocked(createAppointment);

const offering: PublicOffering = {
  id: "offering-1",
  name: "Career Deep Dive",
  description: null,
  category: "CAREER_GROWTH",
  durationMinutes: 45,
  price: 400,
  currency: "INR",
  connectionModes: ["GOOGLE_MEET", "PHONE"],
  availabilityCategories: ["EVENING"],
};

// 22:00 UTC on 2026-03-09 — matches the backend's own DST test instant.
// In Asia/Kolkata (customer, pinned above): 2026-03-10, 3:30 AM.
// In America/New_York (mentor, EDT post-spring-forward): 2026-03-09, 6:00 PM.
const slot: AvailabilitySlot = { startAt: "2026-03-09T22:00:00.000Z", endAt: "2026-03-09T22:45:00.000Z", category: "EVENING" };

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "appt-1",
    mentorId: "mentor-1",
    offeringId: "offering-1",
    customerId: "customer-1",
    startAt: slot.startAt,
    endAt: slot.endAt,
    status: "CONFIRMED",
    connectionMode: "GOOGLE_MEET",
    connectionDetail: null,
    mentorTimezone: "America/New_York",
    offeringSnapshot: { name: offering.name, durationMinutes: offering.durationMinutes, price: offering.price, currency: offering.currency },
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderDialog(propOverrides: Partial<Parameters<typeof BookingDialog>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const onClose = vi.fn();
  const onConflict = vi.fn();
  const onBookingSuccess = vi.fn();

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BookingDialog
          open
          onClose={onClose}
          mentorId="mentor-1"
          mentorName="Priya Sharma"
          offering={offering}
          slot={slot}
          connectionMode="GOOGLE_MEET"
          mentorTimezone="America/New_York"
          onConflict={onConflict}
          onBookingSuccess={onBookingSuccess}
          {...propOverrides}
        />
        <ToastViewport />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { ...utils, queryClient, invalidateSpy, onClose, onConflict, onBookingSuccess };
}

beforeEach(() => {
  mockedCreateAppointment.mockReset();
  useToastStore.setState({ toasts: [] });
});

describe("BookingDialog — review content", () => {
  it("shows the mentor, offering, duration, price, date, time, and connection mode", () => {
    renderDialog();

    expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByText("Career Deep Dive")).toBeInTheDocument();
    expect(screen.getByText(/45 min/)).toBeInTheDocument();
    expect(screen.getByText("INR 400")).toBeInTheDocument();
    expect(screen.getByText(/Google Meet/)).toBeInTheDocument();
    expect(screen.getByText("Tuesday, March 10, 2026")).toBeInTheDocument(); // customer-local date, already past midnight
  });

  it("shows both customer and mentor local time when their timezones differ", () => {
    renderDialog();
    expect(screen.getByText("Your time")).toBeInTheDocument();
    expect(screen.getByText("3:30 AM")).toBeInTheDocument(); // Asia/Kolkata
    expect(screen.getByText("Mentor's time")).toBeInTheDocument();
    expect(screen.getByText(/6:00 PM · America\/New_York/)).toBeInTheDocument();
  });

  it("does not show a mentor-time row when mentor and customer timezones are the same", () => {
    renderDialog({ mentorTimezone: "Asia/Kolkata" });
    expect(screen.queryByText("Mentor's time")).not.toBeInTheDocument();
  });

  it("never fabricates a Google Meet link", () => {
    renderDialog({ connectionMode: "GOOGLE_MEET" });
    expect(screen.queryByText(/meet\.google\.com/i)).not.toBeInTheDocument();
  });
});

describe("BookingDialog — submission", () => {
  it("submits exactly once per click", async () => {
    const user = userEvent.setup();
    mockedCreateAppointment.mockResolvedValue({ appointment: appointment() });
    renderDialog();

    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => expect(mockedCreateAppointment).toHaveBeenCalledTimes(1));
    expect(mockedCreateAppointment).toHaveBeenCalledWith({
      mentorId: "mentor-1",
      offeringId: "offering-1",
      startAt: slot.startAt,
      connectionMode: "GOOGLE_MEET",
    });
  });

  it("does not send a duplicate request on a rapid double click", async () => {
    const user = userEvent.setup();
    let resolveCreate!: (value: { appointment: Appointment }) => void;
    mockedCreateAppointment.mockReturnValue(new Promise((resolve) => (resolveCreate = resolve)));
    renderDialog();

    const confirmButton = screen.getByRole("button", { name: /confirm booking/i });
    await user.click(confirmButton);
    await user.click(confirmButton); // fired while the first request is still in flight

    expect(mockedCreateAppointment).toHaveBeenCalledTimes(1);
    resolveCreate({ appointment: appointment() });
  });

  it("shows a success state, and invalidates availability", async () => {
    const user = userEvent.setup();
    mockedCreateAppointment.mockResolvedValue({ appointment: appointment() });
    const { invalidateSpy, onBookingSuccess } = renderDialog();

    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    expect(await screen.findByText("Booking confirmed")).toBeInTheDocument();
    expect(onBookingSuccess).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: queryKeys.availability.forMentor("mentor-1") })),
    );
  });

  it("shows the offering's connection modes and, for PHONE, the backend-provided connectionDetail", async () => {
    const user = userEvent.setup();
    mockedCreateAppointment.mockResolvedValue({
      appointment: appointment({ connectionMode: "PHONE", connectionDetail: "+1-555-0199" }),
    });
    renderDialog({ connectionMode: "PHONE" });

    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    expect(await screen.findByText("Booking confirmed")).toBeInTheDocument();
    expect(screen.getByText(/\+1-555-0199/)).toBeInTheDocument();
  });
});

describe("BookingDialog — 409 conflict", () => {
  it("shows the required conflict copy, clears the stale slot, closes, and lets the availability query refetch", async () => {
    const user = userEvent.setup();
    mockedCreateAppointment.mockRejectedValue(new ApiError(409, "SLOT_UNAVAILABLE", "That slot was just booked."));
    const { invalidateSpy, onConflict, onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => expect(onConflict).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("That slot was just booked.")).toBeInTheDocument();
    expect(screen.getByText(/is no longer available\. Choose another time to continue\./)).toBeInTheDocument();
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: queryKeys.availability.forMentor("mentor-1") })),
    );
  });

  it("never claims success on a conflict", async () => {
    const user = userEvent.setup();
    mockedCreateAppointment.mockRejectedValue(new ApiError(409, "SLOT_UNAVAILABLE", "That slot was just booked."));
    renderDialog();

    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => expect(mockedCreateAppointment).toHaveBeenCalled());
    expect(screen.queryByText("Booking confirmed")).not.toBeInTheDocument();
  });
});

describe("BookingDialog — other failures", () => {
  it("shows the backend's message inline for a 400, keeps the dialog open, and allows retry", async () => {
    const user = userEvent.setup();
    mockedCreateAppointment.mockRejectedValue(new ApiError(400, "UNSUPPORTED_CONNECTION_MODE", "This offering does not support the requested connection mode."));
    renderDialog();

    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This offering does not support the requested connection mode.");
    // Selections are preserved — the review content is still showing, not replaced by an error screen.
    expect(screen.getByText("Career Deep Dive")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm booking/i })).toBeEnabled();
  });

  it("shows a clear message for a 404 (mentor/offering no longer available)", async () => {
    const user = userEvent.setup();
    mockedCreateAppointment.mockRejectedValue(new ApiError(404, "OFFERING_NOT_FOUND", "Offering not found."));
    renderDialog();

    await user.click(screen.getByRole("button", { name: /confirm booking/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Offering not found.");
  });

  it("shows a meaningful message for a 403", async () => {
    const user = userEvent.setup();
    mockedCreateAppointment.mockRejectedValue(new ApiError(403, "FORBIDDEN", "You do not own this appointment."));
    renderDialog();

    await user.click(screen.getByRole("button", { name: /confirm booking/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You do not own this appointment.");
  });

  it("shows a friendly generic error with retry for a 500, never a raw error code", async () => {
    const user = userEvent.setup();
    mockedCreateAppointment.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Something went wrong."));
    renderDialog();

    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent("INTERNAL_ERROR");
    expect(screen.getByRole("button", { name: /confirm booking/i })).toBeEnabled();
  });

  it("on a 401, invalidates the session so the existing auth guard takes over, without claiming success", async () => {
    const user = userEvent.setup();
    mockedCreateAppointment.mockRejectedValue(new ApiError(401, "UNAUTHENTICATED", "Not authenticated."));
    const { invalidateSpy, onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: queryKeys.auth.session })));
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByText("Booking confirmed")).not.toBeInTheDocument();
  });
});
