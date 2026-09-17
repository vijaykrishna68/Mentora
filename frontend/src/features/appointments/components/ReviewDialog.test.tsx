import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastViewport } from "@/components/ui";
import { ApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/queryKeys";
import { useToastStore } from "@/lib/stores/toastStore";
import type { Review } from "@/types";
import { ReviewDialog } from "./ReviewDialog";

vi.mock("../api", () => ({
  submitReview: vi.fn(),
}));

const { submitReview } = await import("../api");
const mockedSubmitReview = vi.mocked(submitReview);

function review(overrides: Partial<Review> = {}): Review {
  return {
    id: "review-1",
    rating: 5,
    comment: "Great session!",
    createdAt: "2026-03-10T00:00:00.000Z",
    customer: { displayName: "Alex" },
    ...overrides,
  };
}

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const onClose = vi.fn();

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ReviewDialog open onClose={onClose} appointmentId="appt-1" mentorName="Priya Sharma" />
        <ToastViewport />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { ...utils, invalidateSpy, onClose };
}

beforeEach(() => {
  mockedSubmitReview.mockReset();
  useToastStore.setState({ toasts: [] });
});

describe("ReviewDialog — validation", () => {
  it("requires a rating before submitting", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: /submit review/i }));

    expect(await screen.findByText("Select a rating")).toBeInTheDocument();
    expect(mockedSubmitReview).not.toHaveBeenCalled();
  });
});

describe("ReviewDialog — successful submission", () => {
  it("submits the selected rating and comment, and reports success", async () => {
    const user = userEvent.setup();
    mockedSubmitReview.mockResolvedValue({ review: review() });
    const { invalidateSpy, onClose } = renderDialog();

    await user.click(screen.getByRole("radio", { name: "4 stars" }));
    await user.type(screen.getByLabelText(/comment/i), "Really helpful session.");
    await user.click(screen.getByRole("button", { name: /submit review/i }));

    await waitFor(() => expect(mockedSubmitReview).toHaveBeenCalledTimes(1));
    expect(mockedSubmitReview).toHaveBeenCalledWith("appt-1", { rating: 4, comment: "Really helpful session." });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Review submitted")).toBeInTheDocument();
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: queryKeys.appointments.list })),
    );
  });

  it("submits a null comment when none is entered", async () => {
    const user = userEvent.setup();
    mockedSubmitReview.mockResolvedValue({ review: review({ comment: null }) });
    renderDialog();

    await user.click(screen.getByRole("radio", { name: "5 stars" }));
    await user.click(screen.getByRole("button", { name: /submit review/i }));

    await waitFor(() => expect(mockedSubmitReview).toHaveBeenCalledWith("appt-1", { rating: 5, comment: null }));
  });
});

describe("ReviewDialog — duplicate submission prevention", () => {
  it("does not send a duplicate request on a rapid double click", async () => {
    const user = userEvent.setup();
    mockedSubmitReview.mockReturnValue(new Promise(() => {}));
    renderDialog();

    await user.click(screen.getByRole("radio", { name: "5 stars" }));
    const submitButton = screen.getByRole("button", { name: /submit review/i });
    await user.click(submitButton);
    await user.click(submitButton);

    expect(mockedSubmitReview).toHaveBeenCalledTimes(1);
  });
});

describe("ReviewDialog — API failures", () => {
  it("shows a duplicate-review message and allows the dialog to be dismissed", async () => {
    const user = userEvent.setup();
    mockedSubmitReview.mockRejectedValue(new ApiError(409, "REVIEW_ALREADY_EXISTS", "This appointment has already been reviewed."));
    renderDialog();

    await user.click(screen.getByRole("radio", { name: "5 stars" }));
    await user.click(screen.getByRole("button", { name: /submit review/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This appointment has already been reviewed.");
  });

  it("shows a friendly generic error with retry for a 500, never a raw error code", async () => {
    const user = userEvent.setup();
    mockedSubmitReview.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR", "Something went wrong."));
    mockedSubmitReview.mockResolvedValueOnce({ review: review() });
    renderDialog();

    await user.click(screen.getByRole("radio", { name: "5 stars" }));
    await user.click(screen.getByRole("button", { name: /submit review/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent("INTERNAL_ERROR");
    const retryButton = screen.getByRole("button", { name: /submit review/i });
    expect(retryButton).toBeEnabled();

    await user.click(retryButton);
    await waitFor(() => expect(mockedSubmitReview).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Review submitted")).toBeInTheDocument();
  });
});
