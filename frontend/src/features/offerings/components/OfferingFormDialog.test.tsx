import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { MentorReadiness, Offering } from "@/types";
import { OfferingFormDialog } from "./OfferingFormDialog";

vi.mock("../api", () => ({
  createOffering: vi.fn(),
  updateOffering: vi.fn(),
}));

const { createOffering, updateOffering } = await import("../api");
const mockedCreateOffering = vi.mocked(createOffering);
const mockedUpdateOffering = vi.mocked(updateOffering);

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

function offering(overrides: Partial<Offering> = {}): Offering {
  return {
    id: "offering-1",
    mentorProfileId: "mentor-1",
    name: "Career Deep Dive",
    description: "45 minutes on your next move.",
    category: "CAREER_GROWTH",
    durationMinutes: 45,
    price: 400,
    currency: "INR",
    connectionModes: ["GOOGLE_MEET"],
    availabilityCategories: ["MORNING", "EVENING"],
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderDialog(props: Partial<Parameters<typeof OfferingFormDialog>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const onClose = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <OfferingFormDialog open onClose={onClose} availableConnectionModes={["GOOGLE_MEET", "PHONE"]} {...props} />
    </QueryClientProvider>,
  );
  return { ...utils, onClose };
}

beforeEach(() => {
  mockedCreateOffering.mockReset();
  mockedUpdateOffering.mockReset();
});

describe("OfferingFormDialog — create", () => {
  it("creates an offering with the entered fields, connection mode, and availability category", async () => {
    const user = userEvent.setup();
    mockedCreateOffering.mockResolvedValue({ offering: offering(), readiness: readiness() });
    renderDialog();

    await user.type(screen.getByLabelText(/^name/i), "Quick Chat");
    await user.selectOptions(screen.getByLabelText(/category/i), "CAREER_GROWTH");
    const durationInput = screen.getByLabelText(/duration/i);
    await user.clear(durationInput);
    await user.type(durationInput, "20");
    const priceInput = screen.getByLabelText(/price/i);
    await user.clear(priceInput);
    await user.type(priceInput, "150");
    await user.click(screen.getByRole("checkbox", { name: "Google Meet" }));
    await user.click(screen.getByRole("checkbox", { name: "Morning" }));
    await user.click(screen.getByRole("button", { name: /create offering/i }));

    await waitFor(() => expect(mockedCreateOffering).toHaveBeenCalledTimes(1));
    expect(mockedCreateOffering).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Quick Chat",
        category: "CAREER_GROWTH",
        durationMinutes: 20,
        price: 150,
        connectionModes: ["GOOGLE_MEET"],
        availabilityCategories: ["MORNING"],
      }),
    );
  });

  it("requires a name, category, connection mode, and availability category", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: /create offering/i }));

    await screen.findByText("Name is required");
    const alerts = screen.getAllByRole("alert").map((el) => el.textContent);
    expect(alerts).toContain("Choose a category");
    expect(alerts).toContain("Select at least one connection mode");
    expect(alerts).toContain("Select at least one availability category");
    expect(mockedCreateOffering).not.toHaveBeenCalled();
  });

  it("only offers the mentor's own supported connection modes", () => {
    renderDialog({ availableConnectionModes: ["PHONE"] });
    expect(screen.queryByRole("checkbox", { name: "Google Meet" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Phone" })).toBeInTheDocument();
  });

  it("does not derive availability categories from the chosen duration", async () => {
    const user = userEvent.setup();
    mockedCreateOffering.mockResolvedValue({ offering: offering(), readiness: readiness() });
    renderDialog();

    // A short 15-minute offering picks EVENING explicitly — proving there is
    // no duration -> availability-category rule anywhere in the form.
    await user.type(screen.getByLabelText(/^name/i), "Quick Chat");
    await user.selectOptions(screen.getByLabelText(/category/i), "CAREER_GROWTH");
    const durationInput = screen.getByLabelText(/duration/i);
    await user.clear(durationInput);
    await user.type(durationInput, "15");
    await user.click(screen.getByRole("checkbox", { name: "Google Meet" }));
    await user.click(screen.getByRole("checkbox", { name: "Evening" }));
    await user.click(screen.getByRole("button", { name: /create offering/i }));

    await waitFor(() =>
      expect(mockedCreateOffering).toHaveBeenCalledWith(expect.objectContaining({ durationMinutes: 15, availabilityCategories: ["EVENING"] })),
    );
  });
});

describe("OfferingFormDialog — edit", () => {
  it("pre-fills from the existing offering, keeping duration and price intact unless changed", async () => {
    const user = userEvent.setup();
    mockedUpdateOffering.mockResolvedValue({ offering: offering({ name: "Career Deep Dive Plus" }), readiness: readiness() });
    renderDialog({ offering: offering() });

    expect(screen.getByDisplayValue("Career Deep Dive")).toBeInTheDocument();
    expect(screen.getByDisplayValue("45")).toBeInTheDocument();
    expect(screen.getByDisplayValue("400")).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/^name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Career Deep Dive Plus");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(mockedUpdateOffering).toHaveBeenCalledWith(
        "offering-1",
        expect.objectContaining({ name: "Career Deep Dive Plus", durationMinutes: 45, price: 400 }),
      ),
    );
  });
});

describe("OfferingFormDialog — backend conflict/error", () => {
  it("shows the backend's error inline and keeps the form open", async () => {
    const user = userEvent.setup();
    mockedCreateOffering.mockRejectedValue(new ApiError(400, "VALIDATION_ERROR", "Minimum session length is 15 minutes"));
    renderDialog();

    await user.type(screen.getByLabelText(/^name/i), "Quick Chat");
    await user.selectOptions(screen.getByLabelText(/category/i), "CAREER_GROWTH");
    await user.click(screen.getByRole("checkbox", { name: "Google Meet" }));
    await user.click(screen.getByRole("checkbox", { name: "Morning" }));
    await user.click(screen.getByRole("button", { name: /create offering/i }));

    expect(await screen.findByText("Minimum session length is 15 minutes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create offering/i })).toBeEnabled();
  });
});
