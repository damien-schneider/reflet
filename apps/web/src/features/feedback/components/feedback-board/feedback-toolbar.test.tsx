/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../tag-filter-bar", () => ({
  TagFilterBar: ({
    tags,
    selectedTagId,
  }: {
    tags: unknown[];
    selectedTagId: string | null;
  }) => (
    <div data-testid="tag-filter-bar">
      Tags: {tags.length}, selected: {selectedTagId ?? "none"}
    </div>
  ),
}));

import { FeedbackToolbar } from "./feedback-toolbar";

const baseProps = {
  searchQuery: "",
  onSearchChange: vi.fn(),
  onSubmitClick: vi.fn(),
  tags: [] as Array<{ _id: Id<"tags">; name: string; color: string }>,
  isAdmin: false,
  organizationId: "org1" as Id<"organizations">,
  selectedTagId: null,
  onTagSelect: vi.fn(),
};

describe("FeedbackToolbar", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the search input with placeholder", () => {
    render(<FeedbackToolbar {...baseProps} />);
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("renders the submit feedback button", () => {
    render(<FeedbackToolbar {...baseProps} />);
    expect(
      screen.getByRole("button", { name: /Submit Feedback/i })
    ).toBeInTheDocument();
  });

  it("calls onSearchChange when typing in search input", async () => {
    const user = userEvent.setup();
    render(<FeedbackToolbar {...baseProps} />);
    const input = screen.getByPlaceholderText("Search...");
    await user.type(input, "a");
    expect(baseProps.onSearchChange).toHaveBeenCalled();
  });

  it("calls onSubmitClick when submit button clicked", async () => {
    const user = userEvent.setup();
    render(<FeedbackToolbar {...baseProps} />);
    await user.click(screen.getByRole("button", { name: /Submit Feedback/i }));
    expect(baseProps.onSubmitClick).toHaveBeenCalledOnce();
  });

  it("shows TagFilterBar when tags exist", () => {
    render(
      <FeedbackToolbar
        {...baseProps}
        tags={[{ _id: "t1" as Id<"tags">, name: "Bug", color: "red" }]}
      />
    );
    expect(screen.getByTestId("tag-filter-bar")).toBeInTheDocument();
  });

  it("shows TagFilterBar when isAdmin even with no tags", () => {
    render(<FeedbackToolbar {...baseProps} isAdmin />);
    expect(screen.getByTestId("tag-filter-bar")).toBeInTheDocument();
  });

  it("hides TagFilterBar when no tags and not admin", () => {
    render(<FeedbackToolbar {...baseProps} />);
    expect(screen.queryByTestId("tag-filter-bar")).not.toBeInTheDocument();
  });

  it("displays the current searchQuery value", () => {
    render(<FeedbackToolbar {...baseProps} searchQuery="hello" />);
    expect(screen.getByPlaceholderText("Search...")).toHaveValue("hello");
  });
});
