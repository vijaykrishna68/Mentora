import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { DiscoverMentorsResponse, PublicMentorSummary } from "@/types";
import { DiscoverPage } from "./DiscoverPage";

vi.mock("./api", () => ({
  fetchMentors: vi.fn(),
}));

const { fetchMentors } = await import("./api");
const mockedFetchMentors = vi.mocked(fetchMentors);

function mentor(overrides: Partial<PublicMentorSummary> = {}): PublicMentorSummary {
  return {
    id: "mentor-1",
    name: "Priya Sharma",
    headline: "Senior Software Engineer",
    bio: "Bio",
    country: "IN",
    yearsExperience: 8,
    primaryCategory: "CAREER_GROWTH",
    tags: [],
    connectionModes: [],
    avatarUrl: null,
    faq: null,
    averageRating: 4.8,
    reviewCount: 12,
    completedSessionCount: 20,
    offerings: [
      {
        id: "offering-1",
        name: "Career Deep Dive",
        description: null,
        category: "CAREER_GROWTH",
        durationMinutes: 45,
        price: 400,
        currency: "INR",
        connectionModes: [],
        availabilityCategories: [],
      },
    ],
    ...overrides,
  };
}

function response(overrides: Partial<DiscoverMentorsResponse> = {}): DiscoverMentorsResponse {
  return {
    mentors: [mentor()],
    pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
    ...overrides,
  };
}

function renderPage(initialEntry = "/discover") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }
  return render(<DiscoverPage />, { wrapper: Wrapper });
}

beforeEach(() => {
  mockedFetchMentors.mockReset();
});

describe("DiscoverPage", () => {
  it("shows skeleton cards while loading", () => {
    mockedFetchMentors.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading mentors…")).toBeInTheDocument();
  });

  it("renders mentors once loaded", async () => {
    mockedFetchMentors.mockResolvedValue(response());
    renderPage();

    expect(await screen.findByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByText("1 mentor")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view profile/i })).toHaveAttribute("href", "/mentors/mentor-1");
  });

  it("shows an empty state with a reset action when no mentors match", async () => {
    mockedFetchMentors.mockResolvedValue(response({ mentors: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } }));
    renderPage("/discover?q=zzz");

    expect(await screen.findByText("No mentors found")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset filters/i })).toBeInTheDocument();
  });

  it("shows a retryable error state when the request fails", async () => {
    mockedFetchMentors.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Something went wrong."));
    renderPage();

    expect(await screen.findByText("Couldn't load mentors")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("requests the selected category and resets to page 1", async () => {
    const user = userEvent.setup();
    mockedFetchMentors.mockResolvedValue(response());
    renderPage("/discover?page=3");

    await screen.findByText("Priya Sharma");
    mockedFetchMentors.mockClear();

    const filterGroup = screen.getByRole("group", { name: /filter by category/i });
    await user.click(within(filterGroup).getByRole("button", { name: "Leadership" }));

    await waitFor(() => {
      expect(mockedFetchMentors).toHaveBeenCalledWith(expect.objectContaining({ category: "LEADERSHIP", page: 1 }));
    });
  });

  it("requests the selected sort order", async () => {
    const user = userEvent.setup();
    mockedFetchMentors.mockResolvedValue(response());
    renderPage();

    await screen.findByText("Priya Sharma");
    mockedFetchMentors.mockClear();

    await user.selectOptions(screen.getByLabelText("Sort"), "rating");

    await waitFor(() => {
      expect(mockedFetchMentors).toHaveBeenCalledWith(expect.objectContaining({ sort: "rating" }));
    });
  });

  it("paginates using the backend's page/totalPages response", async () => {
    const user = userEvent.setup();
    mockedFetchMentors.mockResolvedValue(response({ pagination: { page: 1, limit: 12, total: 30, totalPages: 3 } }));
    renderPage();

    await screen.findByText("Priya Sharma");
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();

    const previousButton = screen.getByRole("button", { name: "Previous" });
    expect(previousButton).toBeDisabled();

    mockedFetchMentors.mockClear();
    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(mockedFetchMentors).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    });
  });
});
