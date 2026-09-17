import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { ExperienceEntry } from "@/types";
import { ExperienceFormDialog } from "./ExperienceFormDialog";

vi.mock("../api", () => ({
  createExperience: vi.fn(),
  updateExperience: vi.fn(),
}));

const { createExperience, updateExperience } = await import("../api");
const mockedCreateExperience = vi.mocked(createExperience);
const mockedUpdateExperience = vi.mocked(updateExperience);

function entry(overrides: Partial<ExperienceEntry> = {}): ExperienceEntry {
  return {
    id: "exp-1",
    mentorProfileId: "mentor-1",
    organization: "Acme Corp",
    role: "Staff Engineer",
    startDate: "2020-01-15",
    endDate: null,
    description: "Led the platform team.",
    order: 0,
    ...overrides,
  };
}

function renderDialog(props: Partial<Parameters<typeof ExperienceFormDialog>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const onClose = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ExperienceFormDialog open onClose={onClose} {...props} />
    </QueryClientProvider>,
  );
  return { ...utils, onClose };
}

beforeEach(() => {
  mockedCreateExperience.mockReset();
  mockedUpdateExperience.mockReset();
});

describe("ExperienceFormDialog — creation", () => {
  it("creates a new entry with the entered fields", async () => {
    const user = userEvent.setup();
    mockedCreateExperience.mockResolvedValue({ experienceEntry: entry() });
    renderDialog();

    await user.type(screen.getByLabelText(/organization/i), "Acme Corp");
    await user.type(screen.getByLabelText(/role/i), "Staff Engineer");
    await user.type(screen.getByLabelText(/start date/i), "2020-01-15");
    await user.click(screen.getByRole("button", { name: /add experience/i }));

    await waitFor(() => expect(mockedCreateExperience).toHaveBeenCalledTimes(1));
    expect(mockedCreateExperience).toHaveBeenCalledWith(
      expect.objectContaining({ organization: "Acme Corp", role: "Staff Engineer", startDate: "2020-01-15", endDate: null }),
    );
  });

  it("requires organization and role", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: /add experience/i }));

    expect(await screen.findByText("Organization is required")).toBeInTheDocument();
    expect(mockedCreateExperience).not.toHaveBeenCalled();
  });

  it("disables the end date while 'currently work here' is checked", async () => {
    renderDialog();
    expect(screen.getByLabelText("I currently work here")).toBeChecked();
    expect(screen.getByLabelText("End date")).toBeDisabled();
  });

  it("submits an explicit end date once 'currently work here' is unchecked", async () => {
    const user = userEvent.setup();
    mockedCreateExperience.mockResolvedValue({ experienceEntry: entry() });
    renderDialog();

    await user.type(screen.getByLabelText(/organization/i), "Acme Corp");
    await user.type(screen.getByLabelText(/role/i), "Staff Engineer");
    await user.type(screen.getByLabelText(/start date/i), "2020-01-15");
    await user.click(screen.getByLabelText("I currently work here"));
    await user.type(screen.getByLabelText("End date"), "2022-06-01");
    await user.click(screen.getByRole("button", { name: /add experience/i }));

    await waitFor(() => expect(mockedCreateExperience).toHaveBeenCalledWith(expect.objectContaining({ endDate: "2022-06-01" })));
  });
});

describe("ExperienceFormDialog — editing", () => {
  it("pre-fills the form from the existing entry and submits an update", async () => {
    const user = userEvent.setup();
    mockedUpdateExperience.mockResolvedValue({ experienceEntry: entry({ role: "Principal Engineer" }) });
    renderDialog({ entry: entry() });

    expect(screen.getByDisplayValue("Acme Corp")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Staff Engineer")).toBeInTheDocument();

    const roleInput = screen.getByLabelText(/role/i);
    await user.clear(roleInput);
    await user.type(roleInput, "Principal Engineer");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(mockedUpdateExperience).toHaveBeenCalledWith("exp-1", expect.objectContaining({ role: "Principal Engineer" })));
  });
});

describe("ExperienceFormDialog — failures", () => {
  it("shows the backend's date-range error and keeps the dialog open", async () => {
    const user = userEvent.setup();
    mockedCreateExperience.mockRejectedValue(new ApiError(400, "INVALID_DATE_RANGE", "endDate cannot precede startDate."));
    renderDialog();

    await user.type(screen.getByLabelText(/organization/i), "Acme Corp");
    await user.type(screen.getByLabelText(/role/i), "Staff Engineer");
    await user.type(screen.getByLabelText(/start date/i), "2020-01-15");
    await user.click(screen.getByRole("button", { name: /add experience/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("endDate cannot precede startDate.");
  });
});
