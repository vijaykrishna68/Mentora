import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastViewport } from "@/components/ui";
import { ApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/queryKeys";
import { useToastStore } from "@/lib/stores/toastStore";
import type { Appointment, CustomerAppointmentListItem } from "@/types";
import { CancelAppointmentDialog } from "./CancelAppointmentDialog";

vi.mock("../api", () => ({
  cancelAppointment: vi.fn(),
}));
vi.mock("@/lib/utils/datetime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils/datetime")>();
  return { ...actual, getBrowserTimezone: () => "Asia/Kolkata" };
});

const { cancelAppointment } = await import("../api");
const mockedCancelAppointment = vi.mocked(cancelAppointment);

const appointment: CustomerAppointmentListItem = {
  id: "appt-1",
  mentor: { id: "mentor-1", name: "Priya Sharma", avatarUrl: null },
  offeringId: "offering-1",
  startAt: "2026-03-09T22:00:00.000Z",
  endAt: "2026-03-09T22:45:00.000Z",
  mentorTimezone: "America/New_York",
  connectionMode: "GOOGLE_MEET",
  connectionDetail: null,
  offeringSnapshot: { name: "Career Deep Dive", durationMinutes: 45, price: 400, currency: "INR" },
  status: "CONFIRMED",
  canReview: false,
  review: null,
  createdAt: "2026-03-01T00:00:00.000Z",
};

function cancelledAppointment(): Appointment {
  return {
    id: appointment.id,
    mentorId: appointment.mentor.id,
    offeringId: appointment.offeringId,
    customerId: "customer-1",
    startAt: appointment.startAt,
    endAt: appointment.endAt,
    status: "CANCELLED",
    connectionMode: appointment.connectionMode,
    connectionDetail: null,
    mentorTimezone: appointment.mentorTimezone,
    offeringSnapshot: appointment.offeringSnapshot,
    createdAt: appointment.createdAt,
    updatedAt: "2026-03-08T00:00:00.000Z",
  };
}

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const onClose = vi.fn();

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CancelAppointmentDialog open onClose={onClose} appointment={appointment} />
        <ToastViewport />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { ...utils, invalidateSpy, onClose };
}

beforeEach(() => {
  mockedCancelAppointment.mockReset();
  useToastStore.setState({ toasts: [] });
});

describe("CancelAppointmentDialog — confirmation", () => {
  it("asks for confirmation before cancelling, and does nothing until confirmed", () => {
    renderDialog();

    expect(screen.getByText("Cancel this session?")).toBeInTheDocument();
    expect(screen.getByText(/Priya Sharma/)).toBeInTheDocument();
    expect(mockedCancelAppointment).not.toHaveBeenCalled();
  });

  it("closes without cancelling when the user keeps the appointment", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: /keep appointment/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockedCancelAppointment).not.toHaveBeenCalled();
  });
});

describe("CancelAppointmentDialog — successful cancellation", () => {
  it("shows a processing state, calls the cancel endpoint once, and reports success", async () => {
    const user = userEvent.setup();
    let resolveCancel!: (value: { appointment: Appointment }) => void;
    mockedCancelAppointment.mockReturnValue(new Promise((resolve) => (resolveCancel = resolve)));
    const { invalidateSpy, onClose } = renderDialog();

    const confirmButton = screen.getByRole("button", { name: /cancel session/i });
    await user.click(confirmButton);

    expect(await screen.findByText("Cancelling…")).toBeInTheDocument();

    resolveCancel({ appointment: cancelledAppointment() });

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockedCancelAppointment).toHaveBeenCalledTimes(1);
    expect(mockedCancelAppointment).toHaveBeenCalledWith("appt-1");
    expect(await screen.findByText("Appointment cancelled")).toBeInTheDocument();
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: queryKeys.appointments.list })),
    );
  });

  it("does not send a duplicate request on a rapid double click", async () => {
    const user = userEvent.setup();
    mockedCancelAppointment.mockReturnValue(new Promise(() => {}));
    renderDialog();

    const confirmButton = screen.getByRole("button", { name: /cancel session/i });
    await user.click(confirmButton);
    await user.click(confirmButton);

    expect(mockedCancelAppointment).toHaveBeenCalledTimes(1);
  });
});

describe("CancelAppointmentDialog — failures", () => {
  it("shows the backend's message when cancelling after the 24-hour deadline, and keeps the dialog open", async () => {
    const user = userEvent.setup();
    mockedCancelAppointment.mockRejectedValue(
      new ApiError(409, "CANCELLATION_DEADLINE_PASSED", "Cancellation is only allowed until 24 hours before the appointment start."),
    );
    const { onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: /cancel session/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Cancellation is only allowed until 24 hours before the appointment start.");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /cancel session/i })).toBeEnabled();
  });

  it("shows a clear message for an already-cancelled appointment", async () => {
    const user = userEvent.setup();
    mockedCancelAppointment.mockRejectedValue(
      new ApiError(409, "APPOINTMENT_ALREADY_CANCELLED", "This appointment has already been cancelled."),
    );
    renderDialog();

    await user.click(screen.getByRole("button", { name: /cancel session/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This appointment has already been cancelled.");
  });

  it("shows a clear message when the appointment has already completed", async () => {
    const user = userEvent.setup();
    mockedCancelAppointment.mockRejectedValue(
      new ApiError(409, "APPOINTMENT_ALREADY_COMPLETED", "This appointment has already been completed and can no longer be cancelled."),
    );
    renderDialog();

    await user.click(screen.getByRole("button", { name: /cancel session/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This appointment has already been completed and can no longer be cancelled.");
  });

  it("shows a friendly generic error for a 500, never a raw error code, and allows retry", async () => {
    const user = userEvent.setup();
    mockedCancelAppointment.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Something went wrong."));
    renderDialog();

    await user.click(screen.getByRole("button", { name: /cancel session/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent("INTERNAL_ERROR");
    expect(screen.getByRole("button", { name: /cancel session/i })).toBeEnabled();
  });
});
