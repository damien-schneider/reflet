import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    color,
    variant,
  }: {
    children: React.ReactNode;
    color?: string;
    variant?: string;
  }) => (
    <span data-color={color} data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  ArrowSquareOut: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="icon-external-link" />
  ),
  Trash: (props: Record<string, unknown>) => (
    <svg data-testid="icon-trash" {...props} />
  ),
}));

import { CompetitorCard } from "./competitor-card";

afterEach(cleanup);

const baseCompetitor = {
  _id: "comp-1",
  name: "Acme Inc",
  websiteUrl: "https://acme.com",
  description: "A leading competitor in the market.",
  status: "active",
  lastScrapedAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
};

const baseProps = {
  competitor: baseCompetitor,
  onRemove: vi.fn(),
  orgSlug: "test-org",
};

describe("CompetitorCard", () => {
  it("renders competitor name", () => {
    render(<CompetitorCard {...baseProps} />);
    expect(screen.getByText("Acme Inc")).toBeInTheDocument();
  });

  it("renders website link with rel noopener", () => {
    render(<CompetitorCard {...baseProps} />);
    const link = screen.getByText("https://acme.com");
    expect(link.closest("a")).toHaveAttribute("rel", "noopener");
    expect(link.closest("a")).toHaveAttribute("target", "_blank");
  });

  it("renders status badge for active competitor", () => {
    render(<CompetitorCard {...baseProps} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Active")).toHaveAttribute("data-color", "green");
  });

  it("renders status badge for inactive competitor", () => {
    render(
      <CompetitorCard
        {...baseProps}
        competitor={{ ...baseCompetitor, status: "inactive" }}
      />
    );
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toHaveAttribute("data-color", "gray");
  });

  it("renders description when provided", () => {
    render(<CompetitorCard {...baseProps} />);
    expect(
      screen.getByText("A leading competitor in the market.")
    ).toBeInTheDocument();
  });

  it("shows AI profile preview when aiProfile exists", () => {
    render(
      <CompetitorCard
        {...baseProps}
        competitor={{
          ...baseCompetitor,
          aiProfile: JSON.stringify({
            summary: "Acme focuses on enterprise solutions.",
          }),
        }}
      />
    );
    expect(screen.getByText("AI Profile")).toBeInTheDocument();
    expect(
      screen.getByText("Acme focuses on enterprise solutions.")
    ).toBeInTheDocument();
  });

  it("shows plain text AI profile when not JSON", () => {
    render(
      <CompetitorCard
        {...baseProps}
        competitor={{
          ...baseCompetitor,
          aiProfile: "A simple text profile.",
        }}
      />
    );
    expect(screen.getByText("A simple text profile.")).toBeInTheDocument();
  });

  it("does not show AI profile when aiProfile is undefined", () => {
    render(
      <CompetitorCard
        {...baseProps}
        competitor={{
          ...baseCompetitor,
          aiProfile: undefined,
        }}
      />
    );
    expect(screen.queryByText("AI Profile")).not.toBeInTheDocument();
  });

  it("shows feature count when featureList exists", () => {
    render(
      <CompetitorCard
        {...baseProps}
        competitor={{
          ...baseCompetitor,
          featureList: ["SSO", "API", "Webhooks"],
        }}
      />
    );
    expect(screen.getByText("3 features")).toBeInTheDocument();
  });

  it("shows singular feature label for one feature", () => {
    render(
      <CompetitorCard
        {...baseProps}
        competitor={{
          ...baseCompetitor,
          featureList: ["SSO"],
        }}
      />
    );
    expect(screen.getByText("1 feature")).toBeInTheDocument();
  });

  it("does not show feature count when featureList is undefined", () => {
    render(
      <CompetitorCard
        {...baseProps}
        competitor={{
          ...baseCompetitor,
          featureList: undefined,
        }}
      />
    );
    expect(screen.queryByText(/feature/)).not.toBeInTheDocument();
  });

  it("shows Remove button initially", () => {
    render(<CompetitorCard {...baseProps} />);
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });

  it("shows confirmation flow on first remove click", async () => {
    const user = userEvent.setup();
    render(<CompetitorCard {...baseProps} />);
    await user.click(screen.getByText("Remove"));
    expect(screen.getByText("Confirm Remove")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls onRemove on second click (confirmation)", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<CompetitorCard {...baseProps} onRemove={onRemove} />);
    await user.click(screen.getByText("Remove"));
    await user.click(screen.getByText("Confirm Remove"));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("cancels removal when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<CompetitorCard {...baseProps} onRemove={onRemove} />);
    await user.click(screen.getByText("Remove"));
    await user.click(screen.getByText("Cancel"));
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });

  it("shows last scraped time", () => {
    render(<CompetitorCard {...baseProps} />);
    expect(screen.getByText("Scanned 2h ago")).toBeInTheDocument();
  });
});
