import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { PublicMentorDetail } from "@/types";
import { MentorProfilePage } from "./MentorProfilePage";

vi.mock("./useMentorProfile", () => ({
  useMentorProfile: vi.fn(),
}));

const { useMentorProfile } = await import("./useMentorProfile");
const mockedUseMentorProfile = vi.mocked(useMentorProfile);

function mentor(overrides: Partial<PublicMentorDetail> = {}): PublicMentorDetail {
  return {
    id: "mentor-1",
    name: "Priya Sharma",
    headline: "Senior Software Engineer",
    bio: "I help engineers grow their careers.",
    country: "IN",
    yearsExperience: 8,
    primaryCategory: "CAREER_GROWTH",
    tags: ["System Design"],
    connectionModes: ["GOOGLE_MEET", "ZOOM"],
    avatarUrl: null,
    faq: null,
    averageRating: 4.8,
    reviewCount: 12,
    completedSessionCount: 20,
    offerings: [
      {
        id: "offering-1",
        name: "Career Deep Dive",
        description: "A focused session.",
        category: "CAREER_GROWTH",
        durationMinutes: 45,
        price: 400,
        currency: "INR",
        connectionModes: [],
        availabilityCategories: ["EVENING"],
      },
      {
        id: "offering-2",
        name: "System Design Mock",
        description: "Mock interview.",
        category: "SYSTEM_DESIGN",
        durationMinutes: 60,
        price: 600,
        currency: "INR",
        connectionModes: [],
        availabilityCategories: ["EVENING"],
      },
    ],
    experienceEntries: [
      {
        id: "exp-1",
        organization: "Company X",
        role: "Senior Software Engineer",
        startDate: "2021-01-01T00:00:00.000Z",
        endDate: null,
        description: null,
        order: 0,
      },
    ],
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/mentors/mentor-1"]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }
  return render(<MentorProfilePage />, { wrapper: Wrapper });
}

function pendingResult() {
  return { data: undefined, isPending: true, isError: false, error: null, refetch: vi.fn() } as unknown as ReturnType<
    typeof useMentorProfile
  >;
}
function successResult(data: { mentor: PublicMentorDetail }) {
  return { data, isPending: false, isError: false, error: null, refetch: vi.fn() } as unknown as ReturnType<typeof useMentorProfile>;
}
function errorResult(error: unknown) {
  return { data: undefined, isPending: false, isError: true, error, refetch: vi.fn() } as unknown as ReturnType<
    typeof useMentorProfile
  >;
}

beforeEach(() => {
  mockedUseMentorProfile.mockReset();
});

describe("MentorProfilePage", () => {
  it("shows a layout-preserving skeleton while loading", () => {
    mockedUseMentorProfile.mockReturnValue(pendingResult());
    renderPage();
    expect(screen.queryByText("Priya Sharma")).not.toBeInTheDocument();
  });

  it("shows a mentor-not-found state on a 404, with a way back to Discover", () => {
    mockedUseMentorProfile.mockReturnValue(errorResult(new ApiError(404, "MENTOR_NOT_FOUND", "Mentor not found.")));
    renderPage();

    expect(screen.getByText("Mentor not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to discover/i })).toHaveAttribute("href", "/discover");
  });

  it("shows a retryable error state for a non-404 failure, without exposing the raw error code", () => {
    mockedUseMentorProfile.mockReturnValue(errorResult(new ApiError(500, "INTERNAL_ERROR", "Something went wrong.")));
    renderPage();

    expect(screen.getByText("Couldn't load this profile")).toBeInTheDocument();
    expect(screen.queryByText("INTERNAL_ERROR")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders the full profile: identity, rating/session stats, experience, and offerings", () => {
    mockedUseMentorProfile.mockReturnValue(successResult({ mentor: mentor() }));
    renderPage();

    expect(screen.getByRole("heading", { name: "Priya Sharma" })).toBeInTheDocument();
    // Rating + review count (the only review-related data the backend exposes — see report).
    expect(screen.getByText("4.8")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("Sessions completed")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Experience" })).toBeInTheDocument();
    expect(screen.getByText("Company X")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Offerings" })).toBeInTheDocument();
    expect(screen.getByText("Career Deep Dive")).toBeInTheDocument();
    expect(screen.getByText("System Design Mock")).toBeInTheDocument();
  });

  it("omits the Experience section entirely when there are no entries, without inventing any", () => {
    mockedUseMentorProfile.mockReturnValue(successResult({ mentor: mentor({ experienceEntries: [] }) }));
    renderPage();
    expect(screen.queryByRole("heading", { name: "Experience" })).not.toBeInTheDocument();
  });

  it("lets the user select an offering, which reveals date selection and updates the booking CTA", async () => {
    const user = userEvent.setup();
    mockedUseMentorProfile.mockReturnValue(successResult({ mentor: mentor() }));
    renderPage();

    expect(screen.getByRole("button", { name: "Select an offering" })).toBeDisabled();

    const offeringRadio = screen.getByRole("radio", { name: /career deep dive/i });
    expect(offeringRadio).toHaveAttribute("aria-checked", "false");

    await user.click(offeringRadio);

    expect(offeringRadio).toHaveAttribute("aria-checked", "true");
    // Booking itself (date → slot → connection mode → confirm) is covered by the booking feature's own tests.
    expect(screen.getByRole("button", { name: "Select a date" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /select a date/i })).toBeInTheDocument();
  });
});
