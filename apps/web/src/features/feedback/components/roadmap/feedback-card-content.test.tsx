/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  CaretUp: () => <svg data-testid="caret-up-icon" />,
  ChatCircle: () => <svg data-testid="chat-icon" />,
  DotsSixVertical: () => <svg data-testid="dots-icon" />,
  Sparkle: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="sparkle-icon" />
  ),
}));

import type { FeedbackItem } from "../feed-feedback-view";
import { FeedbackCardContent } from "./feedback-card-content";

const makeItem = (overrides: Partial<FeedbackItem> = {}): FeedbackItem => ({
  _id: "fb1" as Id<"feedback">,
  title: "Test feedback",
  description: "A description",
  voteCount: 7,
  commentCount: 3,
  createdAt: Date.now(),
  organizationId: "org1" as Id<"organizations">,
  tags: [],
  ...overrides,
});

describe("FeedbackCardContent", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders feedback title", () => {
    render(<FeedbackCardContent item={makeItem()} />);
    expect(screen.getByText("Test feedback")).toBeInTheDocument();
  });

  it("renders vote and comment counts", () => {
    render(<FeedbackCardContent item={makeItem()} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders tags when present", () => {
    const item = makeItem({
      tags: [
        {
          _id: "t1" as Id<"tags">,
          name: "Bug",
          color: "red",
          icon: "🐛",
        },
        {
          _id: "t2" as Id<"tags">,
          name: "Feature",
          color: "blue",
        },
      ],
    });
    render(<FeedbackCardContent item={item} />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("🐛")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
  });

  it("limits tags to 2 visible", () => {
    const item = makeItem({
      tags: [
        { _id: "t1" as Id<"tags">, name: "Bug", color: "red" },
        { _id: "t2" as Id<"tags">, name: "Feature", color: "blue" },
        { _id: "t3" as Id<"tags">, name: "Hidden", color: "green" },
      ],
    });
    render(<FeedbackCardContent item={item} />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("does not render tags section when tags array is empty", () => {
    render(<FeedbackCardContent item={makeItem({ tags: [] })} />);
    expect(screen.queryByText("Bug")).not.toBeInTheDocument();
  });

  it("skips null tags in array", () => {
    const item = makeItem({
      tags: [null, { _id: "t1" as Id<"tags">, name: "Bug", color: "red" }],
    });
    render(<FeedbackCardContent item={item} />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
  });

  it("shows AI sparkle icon for AI-applied tags", () => {
    const item = makeItem({
      tags: [
        {
          _id: "t1" as Id<"tags">,
          name: "Auto",
          color: "blue",
          appliedByAi: true,
        },
      ],
    });
    render(<FeedbackCardContent item={item} />);
    expect(screen.getByText("Auto")).toBeInTheDocument();
    expect(screen.getByTitle("Applied by AI")).toBeInTheDocument();
  });

  it("applies isDragging styles", () => {
    const { container } = render(
      <FeedbackCardContent isDragging item={makeItem()} />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("opacity-50");
  });

  it("applies isOverlay styles", () => {
    const { container } = render(
      <FeedbackCardContent isOverlay item={makeItem()} />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("shadow-xl");
  });

  it("renders drag handle for admin with listeners", () => {
    const listeners = { onPointerDown: vi.fn() };
    const attributes = { "aria-label": "Drag to reorder" };
    render(
      <FeedbackCardContent
        dragHandleAttributes={attributes as never}
        dragHandleListeners={listeners as never}
        isAdmin
        item={makeItem()}
      />
    );
    expect(
      screen.getByRole("button", { name: "Drag to reorder" })
    ).toBeInTheDocument();
  });

  it("does not render drag handle when not admin", () => {
    render(<FeedbackCardContent isAdmin={false} item={makeItem()} />);
    expect(
      screen.queryByRole("button", { name: "Drag to reorder" })
    ).not.toBeInTheDocument();
  });

  it("does not render drag handle when no listeners provided", () => {
    render(<FeedbackCardContent isAdmin item={makeItem()} />);
    expect(
      screen.queryByRole("button", { name: "Drag to reorder" })
    ).not.toBeInTheDocument();
  });

  it("renders milestones when present", () => {
    const item = makeItem({
      milestones: [
        { _id: "m1" as Id<"milestones">, name: "v1.0", emoji: "🚀" },
        { _id: "m2" as Id<"milestones">, name: "v2.0", emoji: "🎉" },
      ],
    });
    render(<FeedbackCardContent item={item} />);
    expect(screen.getByText("🚀")).toBeInTheDocument();
    expect(screen.getByText("🎉")).toBeInTheDocument();
  });

  it("limits milestones to 2 and shows +N", () => {
    const item = makeItem({
      milestones: [
        { _id: "m1" as Id<"milestones">, name: "v1", emoji: "🚀" },
        { _id: "m2" as Id<"milestones">, name: "v2", emoji: "🎉" },
        { _id: "m3" as Id<"milestones">, name: "v3", emoji: "🔥" },
      ],
    });
    render(<FeedbackCardContent item={item} />);
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.queryByText("🔥")).not.toBeInTheDocument();
  });

  it("uses fallback emoji for milestones without emoji", () => {
    const item = makeItem({
      milestones: [{ _id: "m1" as Id<"milestones">, name: "Beta" }],
    });
    render(<FeedbackCardContent item={item} />);
    expect(screen.getByText("🏁")).toBeInTheDocument();
  });

  it("does not render milestones section when empty", () => {
    render(<FeedbackCardContent item={makeItem({ milestones: [] })} />);
    expect(screen.queryByText("🏁")).not.toBeInTheDocument();
  });
});
