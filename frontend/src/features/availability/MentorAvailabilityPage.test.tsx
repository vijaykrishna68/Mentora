import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { AvailabilityRule, GetMyMentorProfileResponse } from "@/types";
import { MentorAvailabilityPage } from "./MentorAvailabilityPage";

vi.mock("./api", () => ({
  fetchMyAvailabilityRules: vi.fn(),
}));
vi.mock("@/features/mentor-profile-management/api", () => ({
  fetchMyMentorProfile: vi.fn(),
}));
// Pinned so "no browser-timezone substitution" is provable: the page must
// show the mentor's stored profile timezone, never this pinned browser one.
vi.mock("@/lib/utils/datetime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils/datetime")>();
  return { ...actual, getBrowserTimezone: () => "Asia/Kolkata" };
});

const { fetchMyAvailabilityRules } = await import("./api");
const { fetchMyMentorProfile } = await import("@/features/mentor-profile-management/api");
const mockedFetchMyAvailabilityRules = vi.mocked(fetchMyAvailabilityRules);
const mockedFetchMyMentorProfile = vi.mocked(fetchMyMentorProfile);

function profileResponse(timezone: string | null): GetMyMentorProfileResponse {
  return {
    profile: {
      id: "mentor-1",
      userId: "user-1",
      headline: "Hi",
      bio: "Bio",
      country: "IN",
      timezone,
      phone: null,
      yearsExperience: null,
      primaryCategory: null,
      tags: [],
      connectionModes: [],
      avatarUrl: null,
      faq: null,
      acceptingBookings: true,
      onboardingComplete: Boolean(timezone),
      minimumNoticeMinutes: 60,
      maximumAdvanceDays: 30,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    readiness: {
      hasRequiredProfileInfo: true,
      hasTimezone: Boolean(timezone),
      hasActiveOffering: true,
      hasActiveAvailabilityRule: false,
      acceptingBookings: true,
      readyExcludingAcceptingBookings: false,
      isBookable: false,
      reasons: [],
    },
    experienceEntries: [],
  };
}

function rule(overrides: Partial<AvailabilityRule> = {}): AvailabilityRule {
  return {
    id: "rule-1",
    mentorProfileId: "mentor-1",
    dayOfWeek: "MONDAY",
    startTime: "09:00",
    endTime: "12:00",
    bufferMinutes: 0,
    isActive: true,
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MentorAvailabilityPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedFetchMyAvailabilityRules.mockReset();
  mockedFetchMyMentorProfile.mockReset();
});

describe("MentorAvailabilityPage — timezone", () => {
  it("shows the mentor's own stored timezone, never the browser's", async () => {
    mockedFetchMyMentorProfile.mockResolvedValue(profileResponse("America/New_York"));
    mockedFetchMyAvailabilityRules.mockResolvedValue({ rules: [] });
    renderPage();

    expect(await screen.findByText("America/New_York")).toBeInTheDocument();
    expect(screen.queryByText("Asia/Kolkata")).not.toBeInTheDocument();
  });

  it("guides the mentor to set a timezone when none is configured", async () => {
    mockedFetchMyMentorProfile.mockResolvedValue(profileResponse(null));
    mockedFetchMyAvailabilityRules.mockResolvedValue({ rules: [] });
    renderPage();

    expect(await screen.findByRole("link", { name: /set your timezone in profile/i })).toHaveAttribute("href", "/mentor/profile");
    expect(screen.getByText("Not set")).toBeInTheDocument();
  });
});

describe("MentorAvailabilityPage — weekly schedule", () => {
  it("renders the weekly schedule with rules under their day", async () => {
    mockedFetchMyMentorProfile.mockResolvedValue(profileResponse("Asia/Kolkata"));
    mockedFetchMyAvailabilityRules.mockResolvedValue({ rules: [rule()] });
    renderPage();

    expect(await screen.findByText("09:00 — 12:00")).toBeInTheDocument();
    expect(screen.getByText("Monday")).toBeInTheDocument();
  });

  it("shows every day as empty when there are no rules", async () => {
    mockedFetchMyMentorProfile.mockResolvedValue(profileResponse("Asia/Kolkata"));
    mockedFetchMyAvailabilityRules.mockResolvedValue({ rules: [] });
    renderPage();

    expect(await screen.findAllByText("No availability")).toHaveLength(7);
  });
});

describe("MentorAvailabilityPage — error", () => {
  it("shows a retryable error, never a raw code", async () => {
    mockedFetchMyMentorProfile.mockResolvedValue(profileResponse("Asia/Kolkata"));
    mockedFetchMyAvailabilityRules.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Something went wrong."));
    renderPage();

    expect(await screen.findByText("Couldn't load your availability")).toBeInTheDocument();
    expect(screen.queryByText("INTERNAL_ERROR")).not.toBeInTheDocument();
  });
});
