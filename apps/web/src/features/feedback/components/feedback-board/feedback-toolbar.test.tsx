/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toId } from "@/lib/convex-helpers";
import type { Tag } from "../tag-filter-bar";

vi.mock("../tag-filter-bar", () => ({
  TagFilterBar: ({
    tags,
    selectedTagIds,
  }: {
    tags: unknown[];
    selectedTagIds: string[];
  }) => (
    <div data-testid="tag-filter-bar">
      Tags: {tags.length}, selected: {selectedTagIds.join(",") || "none"}
    </div>
  ),
}));

import { FeedbackToolbar } from "./feedback-toolbar";

const baseProps = {
  isAdmin: false,
  onClearTags: vi.fn(),
  onSubmitClick: vi.fn(),
  onTagChange: vi.fn(),
  organizationId: toId("organizations", "org1"),
  selectedTagIds: [],
  tags: [] satisfies Tag[],
};

describe("FeedbackToolbar", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the submit feedback button", () => {
    render(<FeedbackToolbar {...baseProps} />);
    expect(
      screen.getByRole("button", { name: /Submit Feedback/i })
    ).toBeInTheDocument();
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
        tags={[{ _id: toId("tags", "t1"), color: "red", name: "Bug" }]}
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
});
