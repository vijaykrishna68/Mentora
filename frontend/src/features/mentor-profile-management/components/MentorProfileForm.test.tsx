import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { PrivateMentorProfile, UpdateMentorProfileResponse } from "@/types";
import { MentorProfileForm } from "./MentorProfileForm";

vi.mock("../api", () => ({
  updateMyMentorProfile: vi.fn(),
}));
// Deliberately excludes "Asia/Calcutta" (the legacy alias for "Asia/Kolkata"
// some runtimes' ICU data prefers) — see the "stored timezone is a legacy
// alias" test below, which reproduces exactly that mismatch.
vi.mock("@/lib/utils/datetime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils/datetime")>();
  return { ...actual, getBrowserTimezone: () => "Asia/Kolkata", getSupportedTimezones: () => ["Asia/Kolkata", "America/New_York", "UTC"] };
});

const { updateMyMentorProfile } = await import("../api");
const mockedUpdateMyMentorProfile = vi.mocked(updateMyMentorProfile);

function profile(overrides: Partial<PrivateMentorProfile> = {}): PrivateMentorProfile {
  return {
    id: "mentor-1",
    userId: "user-1",
    headline: "Senior Engineer",
    bio: "I help engineers grow.",
    country: "IN",
    timezone: "Asia/Kolkata",
    phone: null,
    yearsExperience: 8,
    primaryCategory: "BACKEND",
    tags: ["react", "node"],
    connectionModes: ["GOOGLE_MEET"],
    avatarUrl: null,
    faq: null,
    acceptingBookings: true,
    onboardingComplete: true,
    minimumNoticeMinutes: 60,
    maximumAdvanceDays: 30,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function updateResponse(p: PrivateMentorProfile): UpdateMentorProfileResponse {
  return {
    profile: p,
    readiness: {
      hasRequiredProfileInfo: true,
      hasTimezone: true,
      hasActiveOffering: true,
      hasActiveAvailabilityRule: true,
      acceptingBookings: true,
      readyExcludingAcceptingBookings: true,
      isBookable: true,
      reasons: [],
    },
  };
}

function renderForm(overrides: Partial<PrivateMentorProfile> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const p = profile(overrides);
  return render(
    <QueryClientProvider client={queryClient}>
      <MentorProfileForm profile={p} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedUpdateMyMentorProfile.mockReset();
});

describe("MentorProfileForm — loads existing data", () => {
  it("pre-fills fields from the profile", () => {
    renderForm();
    expect(screen.getByDisplayValue("Senior Engineer")).toBeInTheDocument();
    expect(screen.getByDisplayValue("I help engineers grow.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("IN")).toBeInTheDocument();
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.getByText("node")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Google Meet" })).toBeChecked();
  });
});

describe("MentorProfileForm — timezone aliases", () => {
  it("still shows and preserves a stored timezone the browser's own IANA list spells differently", async () => {
    // Regression: a stored "Asia/Calcutta" isn't in this runtime's mocked
    // supported-timezone list (which only knows "Asia/Kolkata") — the same
    // kind of legacy-alias mismatch datetime.ts's timezonesDiffer already
    // guards against for display. The select must still show it selected
    // (not silently blank), and a plain Save must not wipe it out.
    const user = userEvent.setup();
    mockedUpdateMyMentorProfile.mockResolvedValue(updateResponse(profile({ timezone: "Asia/Calcutta" })));
    renderForm({ timezone: "Asia/Calcutta" });

    expect(screen.getByLabelText("IANA timezone")).toHaveValue("Asia/Calcutta");

    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => expect(mockedUpdateMyMentorProfile).toHaveBeenCalledWith(expect.objectContaining({ timezone: "Asia/Calcutta" })));
  });
});

describe("MentorProfileForm — update succeeds", () => {
  it("submits the full form state and shows success", async () => {
    const user = userEvent.setup();
    mockedUpdateMyMentorProfile.mockResolvedValue(updateResponse(profile({ headline: "Staff Engineer" })));
    renderForm();

    const headlineInput = screen.getByDisplayValue("Senior Engineer");
    await user.clear(headlineInput);
    await user.type(headlineInput, "Staff Engineer");
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => expect(mockedUpdateMyMentorProfile).toHaveBeenCalledTimes(1));
    expect(mockedUpdateMyMentorProfile).toHaveBeenCalledWith(expect.objectContaining({ headline: "Staff Engineer" }));
  });

  it("selects a timezone from the controlled list", async () => {
    const user = userEvent.setup();
    mockedUpdateMyMentorProfile.mockResolvedValue(updateResponse(profile()));
    renderForm();

    await user.selectOptions(screen.getByLabelText("IANA timezone"), "America/New_York");
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => expect(mockedUpdateMyMentorProfile).toHaveBeenCalledWith(expect.objectContaining({ timezone: "America/New_York" })));
  });

  it("toggles a connection mode", async () => {
    const user = userEvent.setup();
    mockedUpdateMyMentorProfile.mockResolvedValue(updateResponse(profile()));
    renderForm();

    await user.click(screen.getByRole("checkbox", { name: "Phone" }));
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() =>
      expect(mockedUpdateMyMentorProfile).toHaveBeenCalledWith(expect.objectContaining({ connectionModes: expect.arrayContaining(["GOOGLE_MEET", "PHONE"]) })),
    );
  });
});

describe("MentorProfileForm — validation", () => {
  it("rejects a phone number that's too short", async () => {
    const user = userEvent.setup();
    renderForm();

    const phoneInput = screen.getByPlaceholderText("+1 555 0100");
    await user.type(phoneInput, "123");
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    expect(await screen.findByText("Enter a valid phone number")).toBeInTheDocument();
    expect(mockedUpdateMyMentorProfile).not.toHaveBeenCalled();
  });
});

describe("MentorProfileForm — backend error preserves input", () => {
  it("shows the backend's message and keeps the entered values", async () => {
    const user = userEvent.setup();
    mockedUpdateMyMentorProfile.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Something went wrong."));
    renderForm();

    const headlineInput = screen.getByDisplayValue("Senior Engineer");
    await user.clear(headlineInput);
    await user.type(headlineInput, "Draft headline");
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong.");
    expect(screen.getByDisplayValue("Draft headline")).toBeInTheDocument();
  });
});
