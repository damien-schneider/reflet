import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    organizations: { getBySlug: "organizations:getBySlug" },
  },
}));

vi.mock("@phosphor-icons/react", () => ({
  ArrowLeft: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-arrow-left" />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

import { PublicViewToolbar } from "./public-view-toolbar";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PublicViewToolbar", () => {
  it("renders nothing when org query returns undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    const { container } = render(<PublicViewToolbar orgSlug="acme" />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for non-team-member", () => {
    mockUseQuery.mockReturnValue({ role: null });
    const { container } = render(<PublicViewToolbar orgSlug="acme" />);
    expect(container.innerHTML).toBe("");
  });

  it("renders toolbar for owner", () => {
    mockUseQuery.mockReturnValue({ role: "owner" });
    render(<PublicViewToolbar orgSlug="acme" />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("You are in the public view")).toBeInTheDocument();
  });

  it("renders toolbar for admin", () => {
    mockUseQuery.mockReturnValue({ role: "admin" });
    render(<PublicViewToolbar orgSlug="acme" />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders toolbar for member", () => {
    mockUseQuery.mockReturnValue({ role: "member" });
    render(<PublicViewToolbar orgSlug="acme" />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("links to correct dashboard URL", () => {
    mockUseQuery.mockReturnValue({ role: "owner" });
    render(<PublicViewToolbar orgSlug="my-org" />);
    const link = screen.getByText("Dashboard").closest("a");
    expect(link).toHaveAttribute("href", "/dashboard/my-org");
  });
});
