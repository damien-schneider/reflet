import DashboardLayoutClient from "@app/(app)/dashboard/layout-client";
import { SidebarTrigger } from "@ctrl-ui/react/ui/sidebar";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ isAuthenticated: false, isLoading: true }));
const dashboard = vi.hoisted(() => ({ fails: false }));
vi.mock("convex/react", () => ({
  useConvexAuth: () => auth,
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ orgSlug: "acme" }),
  usePathname: () => "/dashboard/acme",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/auth/components/unified-auth/unified-auth-form", () => ({
  default: () => <p>Sign in</p>,
}));
vi.mock("./dashboard-content", () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => {
    if (dashboard.fails) {
      throw new Error("Dashboard query failed");
    }
    return (
      <>
        <SidebarTrigger />
        {children}
      </>
    );
  },
}));

beforeEach(() => {
  auth.isAuthenticated = false;
  auth.isLoading = true;
  dashboard.fails = false;
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      addEventListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn(),
    }))
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    }
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("keeps the same shell while authentication resolves without exposing private content", () => {
  const { container, rerender } = render(
    <DashboardLayoutClient>
      <p>Private feedback</p>
    </DashboardLayoutClient>
  );
  expect(screen.queryByText("Private feedback")).not.toBeInTheDocument();
  const shell = container.querySelector("[data-app-shell]");
  expect(shell).not.toBeNull();
  auth.isLoading = false;
  auth.isAuthenticated = true;
  rerender(
    <DashboardLayoutClient>
      <p>Private feedback</p>
    </DashboardLayoutClient>
  );
  expect(screen.getByText("Private feedback")).toBeVisible();
  expect(container.querySelector("[data-app-shell]")).toBe(shell);
  auth.isAuthenticated = false;
  rerender(
    <DashboardLayoutClient>
      <p>Private feedback</p>
    </DashboardLayoutClient>
  );
  expect(screen.getByText("Sign in")).toBeVisible();
  expect(screen.queryByText("Private feedback")).not.toBeInTheDocument();
});

it("keeps usable sidebar navigation when the dashboard layout fails", () => {
  auth.isAuthenticated = true;
  auth.isLoading = false;
  dashboard.fails = true;
  vi.spyOn(console, "error").mockImplementation(() => undefined);

  const { container } = render(
    <DashboardLayoutClient>
      <p>Private inbox</p>
    </DashboardLayoutClient>
  );

  const alert = screen.getByRole("alert");
  expect(container.querySelector("[data-app-shell-content]")).toContainElement(
    alert
  );
  expect(screen.getByRole("link", { name: "Feedback" })).toHaveAttribute(
    "href",
    "/dashboard/acme"
  );
  expect(screen.getByRole("button", { name: "Open navigation" })).toBeVisible();
  expect(screen.queryByText("Private inbox")).not.toBeInTheDocument();

  dashboard.fails = false;
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(screen.getByText("Private inbox")).toBeVisible();
});
