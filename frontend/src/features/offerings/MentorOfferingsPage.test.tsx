import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { GetMyMentorProfileResponse, Offering } from "@/types";
import { MentorOfferingsPage } from "./MentorOfferingsPage";

vi.mock("./api", () => ({
  fetchMyOfferings: vi.fn(),
  updateOffering: vi.fn(),
}));
vi.mock("@/features/mentor-profile-management/api", () => ({
  fetchMyMentorProfile: vi.fn(),
}));

const { fetchMyOfferings, updateOffering } = await import("./api");
const { fetchMyMentorProfile } = await import("@/features/mentor-profile-management/api");
const mockedFetchMyOfferings = vi.mocked(fetchMyOfferings);
const mockedUpdateOffering = vi.mocked(updateOffering);
const mockedFetchMyMentorProfile = vi.mocked(fetchMyMentorProfile);

function offering(overrides: Partial<Offering> = {}): Offering {
  return {
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
    ...overrides,
  };
}

function profileResponse(): GetMyMentorProfileResponse {
  return {
    profile: {
      id: "mentor-1",
      userId: "user-1",
      headline: "Hi",
      bio: "Bio",
      country: "IN",
      timezone: "Asia/Kolkata",
      phone: null,
      yearsExperience: null,
      primaryCategory: null,
      tags: [],
      connectionModes: ["GOOGLE_MEET", "PHONE"],
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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MentorOfferingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedFetchMyOfferings.mockReset();
  mockedUpdateOffering.mockReset();
  mockedFetchMyMentorProfile.mockResolvedValue(profileResponse());
});

describe("MentorOfferingsPage — loading", () => {
  it("shows a loading state while fetching", () => {
    mockedFetchMyOfferings.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
  });
});

describe("MentorOfferingsPage — empty", () => {
  it("shows an empty state with a call to action", async () => {
    mockedFetchMyOfferings.mockResolvedValue({ offerings: [] });
    renderPage();

    expect(await screen.findByText("No offerings yet")).toBeInTheDocument();
  });
});

describe("MentorOfferingsPage — list", () => {
  it("renders offerings and their active status", async () => {
    mockedFetchMyOfferings.mockResolvedValue({ offerings: [offering(), offering({ id: "offering-2", name: "Quick Chat", isActive: false })] });
    renderPage();

    expect(await screen.findByText("Career Deep Dive")).toBeInTheDocument();
    expect(screen.getByText("Quick Chat")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("deactivates an active offering via the quick action", async () => {
    const user = userEvent.setup();
    mockedFetchMyOfferings.mockResolvedValue({ offerings: [offering()] });
    mockedUpdateOffering.mockResolvedValue({
      offering: offering({ isActive: false }),
      readiness: profileResponse().readiness,
    });
    renderPage();

    await user.click(await screen.findByRole("button", { name: /deactivate/i }));

    await waitFor(() => expect(mockedUpdateOffering).toHaveBeenCalledWith("offering-1", { isActive: false }));
  });
});

describe("MentorOfferingsPage — error", () => {
  it("shows a retryable error, never a raw code", async () => {
    mockedFetchMyOfferings.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Something went wrong."));
    renderPage();

    expect(await screen.findByText("Couldn't load your offerings")).toBeInTheDocument();
    expect(screen.queryByText("INTERNAL_ERROR")).not.toBeInTheDocument();
  });
});
