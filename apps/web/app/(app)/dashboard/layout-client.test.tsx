import DashboardLayoutClient from "@app/(app)/dashboard/layout-client";
import { SidebarTrigger } from "@ctrl-ui/react/ui/sidebar";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ isAuthenticated: false, isLoading: true }));
vi.mock("convex/react", () => ({
  useConvexAuth: () => auth,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/acme" }));
vi.mock("@/features/auth/components/unified-auth/unified-auth-form", () => ({
  default: () => <p>Sign in</p>,
}));
vi.mock("./dashboard-content", () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => (
    <>
      <SidebarTrigger />
      {children}
    </>
  ),
}));

afterEach(() => vi.unstubAllGlobals());

it("keeps the same shell while authentication resolves without exposing private content", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      addEventListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn(),
    }))
  );
  const { container, rerender } = render(
    <DashboardLayoutClient>
      <p>Private feedback</p>
    </DashboardLayoutClient>
  );
  expect(screen.queryByText("Private feedback")).not.toBeInTheDocument();
  const shell = container.querySelector("[data-app-shell]");
  expect(shell).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }));
  auth.isLoading = false;
  auth.isAuthenticated = true;
  rerender(
    <DashboardLayoutClient>
      <p>Private feedback</p>
    </DashboardLayoutClient>
  );
  expect(screen.getByText("Private feedback")).toBeVisible();
  expect(container.querySelector("[data-app-shell]")).toBe(shell);
  expect(
    screen.getByRole("button", { name: "Toggle sidebar" })
  ).toHaveAttribute("aria-expanded", "false");
  auth.isAuthenticated = false;
  rerender(
    <DashboardLayoutClient>
      <p>Private feedback</p>
    </DashboardLayoutClient>
  );
  expect(screen.getByText("Sign in")).toBeVisible();
  expect(screen.queryByText("Private feedback")).not.toBeInTheDocument();
});
