import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/queryKeys";
import { useToastStore } from "@/lib/stores/toastStore";
import type { User } from "@/types";
import { DEMO_ACCOUNTS, DEMO_NOTICE } from "./demoAccounts";

vi.mock("./api", () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  fetchCurrentUser: vi.fn(),
}));

const { login } = await import("./api");
const { LoginPage } = await import("./LoginPage");
const mockedLogin = vi.mocked(login);

function makeUser(role: User["role"]): User {
  return {
    id: role === "MENTOR" ? "user-mentor" : "user-customer",
    email: role === "MENTOR" ? "priya.sharma@mentora.dev" : "ananya.verma@mentora.dev",
    role,
    name: role === "MENTOR" ? "Priya Sharma" : "Ananya Verma",
    interests: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/discover" element={<div>Discover page</div>} />
          <Route path="/mentor" element={<div>Mentor dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...utils, queryClient };
}

async function openDemoDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /try the demo/i }));
  return screen.findByRole("dialog", { name: /explore mentora/i });
}

beforeEach(() => {
  mockedLogin.mockReset();
  useToastStore.setState({ toasts: [] });
});

describe("LoginPage — normal sign in", () => {
  it("still signs in with the email and password entered in the form", async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValue({ user: makeUser("CUSTOMER") });
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), "someone@example.com");
    await user.type(screen.getByLabelText(/password/i), "hunter2hunter2");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByText("Discover page")).toBeInTheDocument();
    expect(mockedLogin).toHaveBeenCalledTimes(1);
    expect(mockedLogin).toHaveBeenCalledWith({ email: "someone@example.com", password: "hunter2hunter2" });
  });

  it("shows validation errors and does not call the API for an empty form", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(mockedLogin).not.toHaveBeenCalled();
  });
});

describe("LoginPage — Try the demo", () => {
  it("renders the demo entry point below the sign in button", () => {
    renderLogin();

    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try the demo/i })).toBeInTheDocument();
  });

  it("opens a role-selection dialog with the customer-facing wording, and Cancel closes it", async () => {
    const user = userEvent.setup();
    renderLogin();

    const dialog = await openDemoDialog(user);

    expect(dialog).toHaveTextContent("Choose how you'd like to explore the platform.");
    expect(screen.getByRole("button", { name: "Explore as a Customer" })).toHaveAccessibleDescription(
      "Book mentoring sessions and manage your appointments.",
    );
    expect(screen.getByRole("button", { name: "Explore as a Mentor" })).toHaveAccessibleDescription(
      "Manage your profile, offerings, availability and appointments.",
    );
    expect(dialog).toHaveTextContent("Demo accounts are pre-populated so you can explore the full experience.");
    expect(mockedLogin).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("never renders the demo password anywhere in the UI", async () => {
    const user = userEvent.setup();
    renderLogin();

    await openDemoDialog(user);

    expect(document.body).not.toHaveTextContent(DEMO_ACCOUNTS.CUSTOMER.password);
  });

  it("logs in through the existing login API with the seeded customer account and lands on /discover", async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValue({ user: makeUser("CUSTOMER") });
    const { queryClient } = renderLogin();

    await openDemoDialog(user);
    await user.click(screen.getByRole("button", { name: "Explore as a Customer" }));

    expect(await screen.findByText("Discover page")).toBeInTheDocument();
    expect(mockedLogin).toHaveBeenCalledTimes(1);
    expect(mockedLogin).toHaveBeenCalledWith(DEMO_ACCOUNTS.CUSTOMER);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(queryClient.getQueryData(queryKeys.auth.session)).toEqual({ user: makeUser("CUSTOMER") }),
    );
  });

  it("logs in through the existing login API with the seeded mentor account and lands on /mentor", async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValue({ user: makeUser("MENTOR") });
    const { queryClient } = renderLogin();

    await openDemoDialog(user);
    await user.click(screen.getByRole("button", { name: "Explore as a Mentor" }));

    expect(await screen.findByText("Mentor dashboard")).toBeInTheDocument();
    expect(mockedLogin).toHaveBeenCalledTimes(1);
    expect(mockedLogin).toHaveBeenCalledWith(DEMO_ACCOUNTS.MENTOR);
    await waitFor(() =>
      expect(queryClient.getQueryData(queryKeys.auth.session)).toEqual({ user: makeUser("MENTOR") }),
    );
  });

  it("announces that the account is shared once the demo session starts", async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValue({ user: makeUser("CUSTOMER") });
    renderLogin();

    await openDemoDialog(user);
    await user.click(screen.getByRole("button", { name: "Explore as a Customer" }));

    await screen.findByText("Discover page");
    await waitFor(() =>
      expect(useToastStore.getState().toasts).toEqual([
        expect.objectContaining({ variant: "info", title: DEMO_NOTICE }),
      ]),
    );
  });

  it("shows a loading state and blocks duplicate submissions while the login is in flight", async () => {
    const user = userEvent.setup();
    mockedLogin.mockReturnValue(new Promise(() => {}));
    renderLogin();

    await openDemoDialog(user);
    await user.click(screen.getByRole("button", { name: "Explore as a Customer" }));

    const pending = await screen.findByRole("button", { name: /entering demo/i });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Explore as a Mentor" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeDisabled();

    await user.click(pending);
    await user.click(screen.getByRole("button", { name: "Explore as a Mentor" }));
    await user.keyboard("{Escape}");

    expect(mockedLogin).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { name: /explore mentora/i })).toBeInTheDocument();
  });

  it("keeps the dialog open with a concise error on failure, without leaking backend details, and allows retry", async () => {
    const user = userEvent.setup();
    mockedLogin.mockRejectedValueOnce(new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password."));
    mockedLogin.mockResolvedValueOnce({ user: makeUser("CUSTOMER") });
    renderLogin();

    await openDemoDialog(user);
    await user.click(screen.getByRole("button", { name: "Explore as a Customer" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We couldn't start the demo right now. Please try again.");
    expect(alert).not.toHaveTextContent(/INVALID_CREDENTIALS|invalid email|ananya|MentoraDemo/i);
    expect(screen.getByRole("dialog", { name: /explore mentora/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Explore as a Customer" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Explore as a Mentor" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Explore as a Customer" }));

    expect(await screen.findByText("Discover page")).toBeInTheDocument();
    expect(mockedLogin).toHaveBeenCalledTimes(2);
  });

  it("closes on Escape when idle and restores the dialog state on reopen", async () => {
    const user = userEvent.setup();
    mockedLogin.mockRejectedValueOnce(new Error("network"));
    renderLogin();

    await openDemoDialog(user);
    await user.click(screen.getByRole("button", { name: "Explore as a Customer" }));
    await screen.findByRole("alert");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await openDemoDialog(user);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
