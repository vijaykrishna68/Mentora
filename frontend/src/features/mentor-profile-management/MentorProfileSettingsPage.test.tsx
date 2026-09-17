import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { GetMyMentorProfileResponse } from "@/types";
import { MentorProfileSettingsPage } from "./MentorProfileSettingsPage";

vi.mock("./api", () => ({
  fetchMyMentorProfile: vi.fn(),
  updateMyMentorProfile: vi.fn(),
}));

const { fetchMyMentorProfile } = await import("./api");
const mockedFetchMyMentorProfile = vi.mocked(fetchMyMentorProfile);

function response(): GetMyMentorProfileResponse {
  return {
    profile: {
      id: "mentor-1",
      userId: "user-1",
      headline: "Senior Engineer",
      bio: "Bio",
      country: "IN",
      timezone: "Asia/Kolkata",
      phone: null,
      yearsExperience: 5,
      primaryCategory: "BACKEND",
      tags: [],
      connectionModes: ["GOOGLE_MEET"],
      avatarUrl: null,
      faq: null,
      acceptingBookings: true,
      onboardingComplete: true,
      minimumNoticeMinutes: 60,
      maximumAdvanceDays: 30,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
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
    experienceEntries: [],
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MentorProfileSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedFetchMyMentorProfile.mockReset();
});

describe("MentorProfileSettingsPage", () => {
  it("renders the profile form, experience manager, and accepting-bookings toggle once loaded", async () => {
    mockedFetchMyMentorProfile.mockResolvedValue(response());
    renderPage();

    expect(await screen.findByDisplayValue("Senior Engineer")).toBeInTheDocument();
    expect(screen.getByText("Experience")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /accepting bookings/i })).toBeInTheDocument();
  });

  it("shows a retryable error, never a raw code", async () => {
    mockedFetchMyMentorProfile.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Something went wrong."));
    renderPage();

    expect(await screen.findByText("Couldn't load your profile")).toBeInTheDocument();
    expect(screen.queryByText("INTERNAL_ERROR")).not.toBeInTheDocument();
  });
});
