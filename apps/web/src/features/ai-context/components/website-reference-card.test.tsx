import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockRefresh = vi.fn().mockResolvedValue(undefined);
const mockRemove = vi.fn().mockResolvedValue(undefined);

vi.mock("convex/react", () => ({
  useMutation: vi.fn((name) => {
    if (typeof name === "string" && name.includes("refresh")) {
      return mockRefresh;
    }
    return mockRemove;
  }),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    website_references: {
      refresh: "website_references.refresh",
      remove: "website_references.remove",
    },
  },
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
    variant,
    title,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
    title?: string;
  }) => (
    <span className={className} data-variant={variant} title={title}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    title,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    title?: string;
    size?: string;
    variant?: string;
  }) => (
    <button disabled={disabled} onClick={onClick} title={title} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react", () => ({
  ArrowsClockwise: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="refresh-icon" />
  ),
  ArrowUpRight: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  Check: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="check-icon" />
  ),
  Spinner: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="spinner-icon" />
  ),
  Trash: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="trash-icon" />
  ),
  Warning: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="warning-icon" />
  ),
}));

import { WebsiteReferenceCard } from "./website-reference-card";

afterEach(() => {
  cleanup();
  mockRefresh.mockClear();
  mockRemove.mockClear();
});

const baseReference = {
  _id: "ref1" as never,
  url: "https://docs.example.com/guide",
  title: "Getting Started Guide",
  description: "A comprehensive guide to get started",
  status: "success" as const,
  lastFetchedAt: Date.now() - 86_400_000,
};

describe("WebsiteReferenceCard", () => {
  it("renders reference title as link", () => {
    render(<WebsiteReferenceCard isAdmin={false} reference={baseReference} />);
    const link = screen.getByText("Getting Started Guide");
    expect(link.closest("a")).toHaveAttribute(
      "href",
      "https://docs.example.com/guide"
    );
  });

  it("renders hostname when title is missing", () => {
    render(
      <WebsiteReferenceCard
        isAdmin={false}
        reference={{ ...baseReference, title: undefined }}
      />
    );
    expect(screen.getByText("docs.example.com")).toBeInTheDocument();
  });

  it("renders URL below title", () => {
    render(<WebsiteReferenceCard isAdmin={false} reference={baseReference} />);
    expect(
      screen.getByText("https://docs.example.com/guide")
    ).toBeInTheDocument();
  });

  it("renders description when available", () => {
    render(<WebsiteReferenceCard isAdmin={false} reference={baseReference} />);
    expect(
      screen.getByText("A comprehensive guide to get started")
    ).toBeInTheDocument();
  });

  it("renders Success badge for success status", () => {
    render(<WebsiteReferenceCard isAdmin={false} reference={baseReference} />);
    expect(screen.getByText("Success")).toBeInTheDocument();
  });

  it("renders Fetching badge for pending status", () => {
    render(
      <WebsiteReferenceCard
        isAdmin={false}
        reference={{ ...baseReference, status: "pending" }}
      />
    );
    expect(screen.getByText("Fetching...")).toBeInTheDocument();
  });

  it("renders Fetching badge for fetching status", () => {
    render(
      <WebsiteReferenceCard
        isAdmin={false}
        reference={{ ...baseReference, status: "fetching" }}
      />
    );
    expect(screen.getByText("Fetching...")).toBeInTheDocument();
  });

  it("renders Error badge for error status", () => {
    render(
      <WebsiteReferenceCard
        isAdmin={false}
        reference={{
          ...baseReference,
          status: "error",
          errorMessage: "Failed to fetch",
        }}
      />
    );
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("renders last fetched date for success status", () => {
    render(<WebsiteReferenceCard isAdmin={false} reference={baseReference} />);
    expect(screen.getByText(/Last fetched:/)).toBeInTheDocument();
  });

  it("does not show admin actions for non-admins", () => {
    render(<WebsiteReferenceCard isAdmin={false} reference={baseReference} />);
    expect(screen.queryByTitle("Refresh")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Delete")).not.toBeInTheDocument();
  });

  it("shows admin refresh and delete buttons for admins", () => {
    render(<WebsiteReferenceCard isAdmin={true} reference={baseReference} />);
    expect(screen.getByTitle("Refresh")).toBeInTheDocument();
    expect(screen.getByTitle("Delete")).toBeInTheDocument();
  });

  it("calls refresh mutation when refresh is clicked", async () => {
    const user = userEvent.setup();
    render(<WebsiteReferenceCard isAdmin={true} reference={baseReference} />);

    await user.click(screen.getByTitle("Refresh"));
    expect(mockRefresh).toHaveBeenCalledWith({ id: "ref1" });
  });

  it("calls remove mutation when delete is clicked", async () => {
    const user = userEvent.setup();
    render(<WebsiteReferenceCard isAdmin={true} reference={baseReference} />);

    await user.click(screen.getByTitle("Delete"));
    expect(mockRemove).toHaveBeenCalledWith({ id: "ref1" });
  });

  it("disables refresh button when status is pending", () => {
    render(
      <WebsiteReferenceCard
        isAdmin={true}
        reference={{ ...baseReference, status: "pending" }}
      />
    );
    expect(screen.getByTitle("Refresh")).toBeDisabled();
  });

  it("has noopener noreferrer on external link", () => {
    render(<WebsiteReferenceCard isAdmin={false} reference={baseReference} />);
    const link = screen.getByText("Getting Started Guide").closest("a");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("target", "_blank");
  });
});
