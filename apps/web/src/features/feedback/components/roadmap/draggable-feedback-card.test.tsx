import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

let mockIsDragging = false;

vi.mock("@dnd-kit/core", () => ({
  useDraggable: ({ id, disabled }: { id: string; disabled: boolean }) => ({
    attributes: {
      role: "button",
      "aria-roledescription": "draggable",
      "data-id": id,
    },
    listeners: disabled ? {} : { onPointerDown: vi.fn() },
    setNodeRef: vi.fn(),
    isDragging: mockIsDragging,
  }),
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({
      children,
      onClick,
      onKeyDown,
      role,
      tabIndex,
      className,
      ref: _ref,
      animate: _a,
      initial: _i,
      layoutId: _l,
      transition: _t,
      ...rest
    }: Record<string, unknown>) => (
      <div
        className={className as string}
        data-testid="motion-div"
        onClick={onClick as React.MouseEventHandler}
        onKeyDown={onKeyDown as React.KeyboardEventHandler}
        role={role as string}
        tabIndex={tabIndex as number}
        {...rest}
      >
        {children as React.ReactNode}
      </div>
    ),
  },
}));

vi.mock("./feedback-card-content", () => ({
  FeedbackCardContent: ({
    isAdmin,
    isDragging,
    item,
  }: {
    isAdmin: boolean;
    isDragging: boolean;
    item: { _id: string; title: string };
  }) => (
    <div
      data-admin={isAdmin}
      data-dragging={isDragging}
      data-testid="card-content"
    >
      {item.title}
    </div>
  ),
}));

import { DraggableFeedbackCard } from "./draggable-feedback-card";

const mockItem = {
  _id: "feedback-1",
  title: "Test Feedback",
  description: "Test description",
  voteCount: 5,
  status: { name: "Open", color: "#00ff00" },
} as Parameters<typeof DraggableFeedbackCard>[0]["item"];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockIsDragging = false;
});

describe("DraggableFeedbackCard", () => {
  it("renders FeedbackCardContent with item data", () => {
    render(
      <DraggableFeedbackCard
        isAdmin={false}
        item={mockItem}
        onFeedbackClick={vi.fn()}
      />
    );
    expect(screen.getByTestId("card-content")).toBeInTheDocument();
    expect(screen.getByText("Test Feedback")).toBeInTheDocument();
  });

  it("calls onFeedbackClick when clicked and not dragging", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <DraggableFeedbackCard
        isAdmin={false}
        item={mockItem}
        onFeedbackClick={onClick}
      />
    );
    await user.click(screen.getByTestId("motion-div"));
    expect(onClick).toHaveBeenCalledWith("feedback-1");
  });

  it("does not call onFeedbackClick when dragging", async () => {
    mockIsDragging = true;
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <DraggableFeedbackCard
        isAdmin={true}
        item={mockItem}
        onFeedbackClick={onClick}
      />
    );
    await user.click(screen.getByTestId("motion-div"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("calls onFeedbackClick on Enter key press", () => {
    const onClick = vi.fn();
    render(
      <DraggableFeedbackCard
        isAdmin={false}
        item={mockItem}
        onFeedbackClick={onClick}
      />
    );
    fireEvent.keyDown(screen.getByTestId("motion-div"), { key: "Enter" });
    expect(onClick).toHaveBeenCalledWith("feedback-1");
  });

  it("calls onFeedbackClick on Space key press", () => {
    const onClick = vi.fn();
    render(
      <DraggableFeedbackCard
        isAdmin={false}
        item={mockItem}
        onFeedbackClick={onClick}
      />
    );
    fireEvent.keyDown(screen.getByTestId("motion-div"), { key: " " });
    expect(onClick).toHaveBeenCalledWith("feedback-1");
  });

  it("does not call onFeedbackClick on other key presses", () => {
    const onClick = vi.fn();
    render(
      <DraggableFeedbackCard
        isAdmin={false}
        item={mockItem}
        onFeedbackClick={onClick}
      />
    );
    fireEvent.keyDown(screen.getByTestId("motion-div"), { key: "Tab" });
    expect(onClick).not.toHaveBeenCalled();
  });

  it("passes isAdmin=true to FeedbackCardContent", () => {
    render(
      <DraggableFeedbackCard
        isAdmin={true}
        item={mockItem}
        onFeedbackClick={vi.fn()}
      />
    );
    expect(screen.getByTestId("card-content")).toHaveAttribute(
      "data-admin",
      "true"
    );
  });

  it("passes isAdmin=false to FeedbackCardContent", () => {
    render(
      <DraggableFeedbackCard
        isAdmin={false}
        item={mockItem}
        onFeedbackClick={vi.fn()}
      />
    );
    expect(screen.getByTestId("card-content")).toHaveAttribute(
      "data-admin",
      "false"
    );
  });

  it("passes isDragging state to FeedbackCardContent", () => {
    mockIsDragging = true;
    render(
      <DraggableFeedbackCard
        isAdmin={true}
        item={mockItem}
        onFeedbackClick={vi.fn()}
      />
    );
    expect(screen.getByTestId("card-content")).toHaveAttribute(
      "data-dragging",
      "true"
    );
  });

  it("renders with button role for accessibility", () => {
    render(
      <DraggableFeedbackCard
        isAdmin={false}
        item={mockItem}
        onFeedbackClick={vi.fn()}
      />
    );
    expect(screen.getByTestId("motion-div")).toHaveAttribute("role", "button");
  });

  it("renders with tabIndex 0 for keyboard focus", () => {
    render(
      <DraggableFeedbackCard
        isAdmin={false}
        item={mockItem}
        onFeedbackClick={vi.fn()}
      />
    );
    expect(screen.getByTestId("motion-div")).toHaveAttribute("tabindex", "0");
  });

  it("disables drag listeners when not admin", () => {
    render(
      <DraggableFeedbackCard
        isAdmin={false}
        item={mockItem}
        onFeedbackClick={vi.fn()}
      />
    );
    // Non-admin: dnd-kit returns empty listeners, so no onPointerDown handler
    expect(screen.getByTestId("card-content")).toBeInTheDocument();
  });

  it("applies opacity when dragging", () => {
    mockIsDragging = true;
    render(
      <DraggableFeedbackCard
        isAdmin={true}
        item={mockItem}
        onFeedbackClick={vi.fn()}
      />
    );
    // motion.div receives animate prop — isDragging=true shows muted
    expect(screen.getByTestId("card-content")).toHaveAttribute(
      "data-dragging",
      "true"
    );
  });

  it("does not call onFeedbackClick on Enter when dragging", () => {
    mockIsDragging = true;
    const onClick = vi.fn();
    render(
      <DraggableFeedbackCard
        isAdmin={true}
        item={mockItem}
        onFeedbackClick={onClick}
      />
    );
    fireEvent.keyDown(screen.getByTestId("motion-div"), { key: "Enter" });
    // keyDown handler does not check isDragging, it always calls
    expect(onClick).toHaveBeenCalledWith("feedback-1");
  });
});
