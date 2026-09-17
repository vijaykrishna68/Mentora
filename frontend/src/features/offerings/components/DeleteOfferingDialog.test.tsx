import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastViewport } from "@/components/ui";
import { ApiError } from "@/lib/api/errors";
import { useToastStore } from "@/lib/stores/toastStore";
import type { MentorReadiness, Offering } from "@/types";
import { DeleteOfferingDialog } from "./DeleteOfferingDialog";

vi.mock("../api", () => ({
  deleteOffering: vi.fn(),
}));

const { deleteOffering } = await import("../api");
const mockedDeleteOffering = vi.mocked(deleteOffering);

function readiness(): MentorReadiness {
  return {
    hasRequiredProfileInfo: true,
    hasTimezone: true,
    hasActiveOffering: false,
    hasActiveAvailabilityRule: true,
    acceptingBookings: true,
    readyExcludingAcceptingBookings: false,
    isBookable: false,
    reasons: ["Create at least one active offering."],
  };
}

const offering: Offering = {
  id: "offering-1",
  mentorProfileId: "mentor-1",
  name: "Career Deep Dive",
  description: null,
  category: "CAREER_GROWTH",
  durationMinutes: 45,
  price: 400,
  currency: "INR",
  connectionModes: ["GOOGLE_MEET"],
  availabilityCategories: ["MORNING"],
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const onClose = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <DeleteOfferingDialog open onClose={onClose} offering={offering} />
      <ToastViewport />
    </QueryClientProvider>,
  );
  return { ...utils, onClose };
}

beforeEach(() => {
  mockedDeleteOffering.mockReset();
  useToastStore.setState({ toasts: [] });
});

describe("DeleteOfferingDialog", () => {
  it("explains both possible outcomes before confirming", () => {
    renderDialog();
    expect(screen.getByText(/deleted entirely/i)).toBeInTheDocument();
    expect(screen.getByText(/archived instead/i)).toBeInTheDocument();
    expect(mockedDeleteOffering).not.toHaveBeenCalled();
  });

  it("reports a hard delete when the backend says it was never booked", async () => {
    const user = userEvent.setup();
    mockedDeleteOffering.mockResolvedValue({ deleted: true, archived: false, offering: null, readiness: readiness() });
    const { onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: /remove offering/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Offering deleted")).toBeInTheDocument();
  });

  it("reports an archive when the backend says it has existing bookings — never claims it vanished", async () => {
    const user = userEvent.setup();
    mockedDeleteOffering.mockResolvedValue({
      deleted: false,
      archived: true,
      offering: { ...offering, isActive: false },
      readiness: readiness(),
    });
    renderDialog();

    await user.click(screen.getByRole("button", { name: /remove offering/i }));

    expect(await screen.findByText("Offering archived")).toBeInTheDocument();
    expect(screen.getByText(/existing bookings/i)).toBeInTheDocument();
  });

  it("shows a friendly error and keeps the dialog open on failure", async () => {
    const user = userEvent.setup();
    mockedDeleteOffering.mockRejectedValue(new ApiError(404, "OFFERING_NOT_FOUND", "Offering not found."));
    const { onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: /remove offering/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Offering not found.");
    expect(onClose).not.toHaveBeenCalled();
  });
});
