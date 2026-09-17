import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { GetMyMentorProfileResponse, MentorReadiness, PrivateMentorProfile } from "@/types";
import { MentorSetupPage } from "./MentorSetupPage";

vi.mock("./api", () => ({
  fetchMyMentorProfile: vi.fn(),
  updateMyMentorProfile: vi.fn(),
}));

const { fetchMyMentorProfile } = await import("./api");
const mockedFetchMyMentorProfile = vi.mocked(fetchMyMentorProfile);

function profile(overrides: Partial<PrivateMentorProfile> = {}): PrivateMentorProfile {
  return {
    id: "mentor-1",
    userId: "user-1",
    headline: null,
    bio: null,
    country: null,
    timezone: null,
    phone: null,
    yearsExperience: null,
    primaryCategory: null,
    tags: [],
    connectionModes: [],
    avatarUrl: null,
    faq: null,
    acceptingBookings: false,
    onboardingComplete: false,
    minimumNoticeMinutes: 60,
    maximumAdvanceDays: 30,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function readiness(overrides: Partial<MentorReadiness> = {}): MentorReadiness {
  return {
    hasRequiredProfileInfo: false,
    hasTimezone: false,
    hasActiveOffering: false,
    hasActiveAvailabilityRule: false,
    acceptingBookings: false,
    readyExcludingAcceptingBookings: false,
    isBookable: false,
    reasons: ["Add a headline and bio to your profile.", "Set your timezone."],
    ...overrides,
  };
}

function response(overrides: Partial<GetMyMentorProfileResponse> = {}): GetMyMentorProfileResponse {
  return { profile: profile(), readiness: readiness(), experienceEntries: [], ...overrides };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MentorSetupPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedFetchMyMentorProfile.mockReset();
});

describe("MentorSetupPage — incomplete mentor", () => {
  it("never claims bookable and shows unmet checklist items", async () => {
    mockedFetchMyMentorProfile.mockResolvedValue(response());
    renderPage();

    expect(await screen.findByText("Not yet bookable")).toBeInTheDocument();
    expect(screen.queryByText("Bookable")).not.toBeInTheDocument();
    expect(screen.getByText("Add a headline and bio")).toBeInTheDocument();
  });

  it("links each step to its own management page", async () => {
    mockedFetchMyMentorProfile.mockResolvedValue(response());
    renderPage();

    await screen.findByText("Not yet bookable");
    expect(screen.getByRole("link", { name: /edit profile/i })).toHaveAttribute("href", "/mentor/profile");
    expect(screen.getByRole("link", { name: /manage offerings/i })).toHaveAttribute("href", "/mentor/offerings");
    expect(screen.getByRole("link", { name: /manage availability/i })).toHaveAttribute("href", "/mentor/availability");
  });
});

describe("MentorSetupPage — ready mentor", () => {
  it("reflects a fully-ready, bookable mentor", async () => {
    mockedFetchMyMentorProfile.mockResolvedValue(
      response({
        profile: profile({ acceptingBookings: true, headline: "Hi", bio: "Bio", timezone: "Asia/Kolkata" }),
        readiness: readiness({
          hasRequiredProfileInfo: true,
          hasTimezone: true,
          hasActiveOffering: true,
          hasActiveAvailabilityRule: true,
          acceptingBookings: true,
          readyExcludingAcceptingBookings: true,
          isBookable: true,
          reasons: [],
        }),
      }),
    );
    renderPage();

    expect(await screen.findByText("Bookable")).toBeInTheDocument();
  });
});

describe("MentorSetupPage — error", () => {
  it("shows a retryable error, never a raw code", async () => {
    mockedFetchMyMentorProfile.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Something went wrong."));
    renderPage();

    expect(await screen.findByText("Couldn't load your setup progress")).toBeInTheDocument();
    expect(screen.queryByText("INTERNAL_ERROR")).not.toBeInTheDocument();
  });
});
