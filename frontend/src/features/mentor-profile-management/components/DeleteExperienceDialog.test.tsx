import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { ExperienceEntry } from "@/types";
import { DeleteExperienceDialog } from "./DeleteExperienceDialog";

vi.mock("../api", () => ({
  deleteExperience: vi.fn(),
}));

const { deleteExperience } = await import("../api");
const mockedDeleteExperience = vi.mocked(deleteExperience);

const entry: ExperienceEntry = {
  id: "exp-1",
  mentorProfileId: "mentor-1",
  organization: "Acme Corp",
  role: "Staff Engineer",
  startDate: "2020-01-15",
  endDate: null,
  description: null,
  order: 0,
};

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const onClose = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <DeleteExperienceDialog open onClose={onClose} entry={entry} />
    </QueryClientProvider>,
  );
  return { ...utils, onClose };
}

beforeEach(() => {
  mockedDeleteExperience.mockReset();
});

describe("DeleteExperienceDialog", () => {
  it("asks for confirmation and does nothing until confirmed", () => {
    renderDialog();
    expect(screen.getByText("Remove this experience entry?")).toBeInTheDocument();
    expect(mockedDeleteExperience).not.toHaveBeenCalled();
  });

  it("closes without deleting when the user keeps it", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: /keep it/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockedDeleteExperience).not.toHaveBeenCalled();
  });

  it("deletes on confirmation and reports success", async () => {
    const user = userEvent.setup();
    mockedDeleteExperience.mockResolvedValue({ success: true });
    const { onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: /^remove$/i }));

    await waitFor(() => expect(mockedDeleteExperience).toHaveBeenCalledWith("exp-1"));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("shows a friendly error and keeps the dialog open on failure", async () => {
    const user = userEvent.setup();
    mockedDeleteExperience.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Something went wrong."));
    const { onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: /^remove$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong.");
    expect(onClose).not.toHaveBeenCalled();
  });
});
