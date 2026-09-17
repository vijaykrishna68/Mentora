import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicOffering } from "@/types";
import { BookingPanel } from "./BookingPanel";

vi.mock("../useAvailability", () => ({
  useAvailability: vi.fn(),
}));

const { useAvailability } = await import("../useAvailability");
const mockedUseAvailability = vi.mocked(useAvailability);

function offering(overrides: Partial<PublicOffering> = {}): PublicOffering {
  return {
    id: "offering-1",
    name: "Career Deep Dive",
    description: null,
    category: "CAREER_GROWTH",
    durationMinutes: 45,
    price: 400,
    currency: "INR",
    connectionModes: ["GOOGLE_MEET", "PHONE"],
    availabilityCategories: ["EVENING"],
    ...overrides,
  };
}

function pendingAvailability() {
  return { data: undefined, isPending: true, isError: false, error: null, refetch: vi.fn() } as unknown as ReturnType<typeof useAvailability>;
}

function loadedAvailability(slots: Array<{ startAt: string; endAt: string; category: "MORNING" | "AFTERNOON" | "EVENING" }>) {
  return {
    data: { mentorId: "mentor-1", offeringId: "offering-1", date: "x", timezone: "Asia/Kolkata", slots },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useAvailability>;
}

const ONE_SLOT = [{ startAt: "2026-03-09T22:00:00.000Z", endAt: "2026-03-09T22:45:00.000Z", category: "EVENING" as const }];

function renderPanel(props: Partial<ComponentProps<typeof BookingPanel>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BookingPanel
          mentorId="mentor-1"
          mentorName="Priya Sharma"
          mentorConnectionModes={["GOOGLE_MEET", "PHONE"]}
          selectedOffering={null}
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function firstDatePill() {
  const group = screen.getByRole("radiogroup", { name: /select a date/i });
  return group.querySelectorAll('[role="radio"]')[0] as HTMLElement;
}

function secondDatePill() {
  const group = screen.getByRole("radiogroup", { name: /select a date/i });
  return group.querySelectorAll('[role="radio"]')[1] as HTMLElement;
}

beforeEach(() => {
  mockedUseAvailability.mockReset();
  mockedUseAvailability.mockReturnValue(pendingAvailability());
});

describe("BookingPanel", () => {
  it("prompts for an offering first, with the CTA disabled", () => {
    renderPanel({ selectedOffering: null });
    expect(screen.getByRole("button", { name: "Select an offering" })).toBeDisabled();
    expect(screen.queryByRole("radiogroup", { name: /select a date/i })).not.toBeInTheDocument();
  });

  it("reveals date selection once an offering is chosen, CTA asks for a date", () => {
    renderPanel({ selectedOffering: offering() });
    expect(screen.getByRole("radiogroup", { name: /select a date/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select a date" })).toBeDisabled();
  });

  it("clears the selected slot when the date changes", async () => {
    const user = userEvent.setup();
    mockedUseAvailability.mockReturnValue(loadedAvailability(ONE_SLOT));
    renderPanel({ selectedOffering: offering() });

    await user.click(firstDatePill());
    const slotButton = screen.getByRole("radio", { name: /(AM|PM)/i });
    await user.click(slotButton);
    expect(slotButton).toHaveAttribute("aria-checked", "true");

    await user.click(secondDatePill());

    // The CTA falls back to "Select a time": the slot was cleared by the date change.
    expect(screen.getByRole("button", { name: "Select a time" })).toBeInTheDocument();
  });

  it("auto-selects the connection mode when the offering only supports one, skipping the selector", async () => {
    const user = userEvent.setup();
    mockedUseAvailability.mockReturnValue(loadedAvailability(ONE_SLOT));
    renderPanel({ selectedOffering: offering({ connectionModes: ["PHONE"] }), mentorConnectionModes: ["PHONE"] });

    await user.click(firstDatePill());
    await user.click(screen.getByRole("radio", { name: /(AM|PM)/i }));

    expect(screen.queryByRole("radiogroup", { name: /connection mode/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm booking/i })).toBeEnabled();
  });

  it("shows a connection-mode selector when the offering supports more than one, and the CTA waits for it", async () => {
    const user = userEvent.setup();
    mockedUseAvailability.mockReturnValue(loadedAvailability(ONE_SLOT));
    renderPanel({ selectedOffering: offering({ connectionModes: ["GOOGLE_MEET", "PHONE"] }) });

    await user.click(firstDatePill());
    await user.click(screen.getByRole("radio", { name: /(AM|PM)/i }));

    expect(screen.getByRole("button", { name: "Select a connection mode" })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: /phone/i }));
    expect(screen.getByRole("button", { name: /confirm booking/i })).toBeEnabled();
  });

  it("only offers connection modes supported by both the offering and the mentor (intersection)", async () => {
    const user = userEvent.setup();
    mockedUseAvailability.mockReturnValue(loadedAvailability(ONE_SLOT));
    // Offering supports GOOGLE_MEET + ZOOM; mentor only supports GOOGLE_MEET + PHONE — intersection is GOOGLE_MEET alone.
    renderPanel({
      selectedOffering: offering({ connectionModes: ["GOOGLE_MEET", "ZOOM"] }),
      mentorConnectionModes: ["GOOGLE_MEET", "PHONE"],
    });

    await user.click(firstDatePill());
    await user.click(screen.getByRole("radio", { name: /(AM|PM)/i }));

    // Exactly one mode in the intersection — auto-selected, no selector shown.
    expect(screen.queryByRole("radiogroup", { name: /connection mode/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm booking/i })).toBeEnabled();
  });

  it("resets all selections when the offering itself changes (parent remounts via key)", () => {
    mockedUseAvailability.mockReturnValue(loadedAvailability([]));

    const first = offering({ id: "offering-1" });
    const { rerender } = render(
      <MemoryRouter>
        <BookingPanel key={first.id} mentorId="mentor-1" mentorName="Priya" mentorConnectionModes={["GOOGLE_MEET"]} selectedOffering={first} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Select a date" })).toBeInTheDocument();

    const second = offering({ id: "offering-2", name: "System Design Mock" });
    rerender(
      <MemoryRouter>
        <BookingPanel key={second.id} mentorId="mentor-1" mentorName="Priya" mentorConnectionModes={["GOOGLE_MEET"]} selectedOffering={second} />
      </MemoryRouter>,
    );

    // Still asking for a date — nothing carried over from the previous offering.
    expect(screen.getByRole("button", { name: "Select a date" })).toBeInTheDocument();
  });
});
