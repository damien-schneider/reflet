import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActivityPanel } from "@/features/autopilot/components/activity-panel";
import { toOrgId } from "@/lib/convex-helpers";

const { mockUsePaginatedQuery, loadMoreSpy } = vi.hoisted(() => ({
  mockUsePaginatedQuery: vi.fn(),
  loadMoreSpy: vi.fn(),
}));

vi.mock("convex/react", () => ({
  usePaginatedQuery: (...args: unknown[]) => mockUsePaginatedQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    autopilot: {
      queries: {
        activity: {
          listActivityPaginated: "autopilot.activity.listActivityPaginated",
        },
      },
    },
  },
}));

function buildEntry(overrides: Record<string, unknown> = {}) {
  return {
    _id: "log_1",
    agent: "cto" as const,
    level: "warning" as const,
    message: "Cannot produce codebase_understanding",
    details: "Missing repo analysis for org",
    action: "produceCodebaseUnderstanding",
    entityType: "document" as const,
    entityId: "doc_42",
    targetAgent: undefined,
    workItemId: undefined,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("ActivityPanel", () => {
  afterEach(() => {
    cleanup();
    mockUsePaginatedQuery.mockReset();
    loadMoreSpy.mockReset();
  });
  it("renders activity rows from paginated query", () => {
    mockUsePaginatedQuery.mockReturnValue({
      results: [buildEntry()],
      status: "CanLoadMore",
      loadMore: loadMoreSpy,
    });

    render(<ActivityPanel organizationId={toOrgId("org_1")} />);

    expect(
      screen.getByText(/Cannot produce codebase_understanding/)
    ).toBeInTheDocument();
    expect(screen.getByText("CTO")).toBeInTheDocument();
  });

  it("expands a row with full metadata when clicked", async () => {
    const user = userEvent.setup();
    mockUsePaginatedQuery.mockReturnValue({
      results: [buildEntry()],
      status: "Exhausted",
      loadMore: loadMoreSpy,
    });

    render(<ActivityPanel organizationId={toOrgId("org_1")} />);

    const rowButtons = screen
      .getAllByRole("button")
      .filter(
        (el) =>
          el.getAttribute("aria-expanded") !== null &&
          el.textContent?.includes("Cannot produce codebase_understanding")
      );
    expect(rowButtons).toHaveLength(1);
    const row = rowButtons[0];
    expect(row.getAttribute("aria-expanded")).toBe("false");

    await user.click(row);

    expect(row.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(
      screen.getByText("produceCodebaseUnderstanding")
    ).toBeInTheDocument();
    expect(screen.getByText("Entity id")).toBeInTheDocument();
    expect(screen.getByText("doc_42")).toBeInTheDocument();
  });

  it("shows skeletons while first page is loading", () => {
    mockUsePaginatedQuery.mockReturnValue({
      results: [],
      status: "LoadingFirstPage",
      loadMore: loadMoreSpy,
    });

    const { container } = render(
      <ActivityPanel organizationId={toOrgId("org_1")} />
    );

    expect(container.querySelectorAll('[class*="skeleton"]').length).toBe(0);
    // 8 skeleton elements rendered as divs with rounded-xl
    expect(container.querySelectorAll("div.rounded-xl").length).toBeGreaterThan(
      0
    );
  });

  it("renders empty state when filtered results are empty", () => {
    mockUsePaginatedQuery.mockReturnValue({
      results: [],
      status: "Exhausted",
      loadMore: loadMoreSpy,
    });

    render(<ActivityPanel organizationId={toOrgId("org_1")} />);

    expect(
      screen.getByText(/No activity matches your filters/)
    ).toBeInTheDocument();
  });
});
