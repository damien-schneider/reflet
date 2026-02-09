import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type BoardView, BoardViewToggle } from "./board-view-toggle";

// Mock phosphor icons (component imports Flag, GridFour, List)
vi.mock("@phosphor-icons/react", () => ({
  Flag: () => <svg data-testid="flag-icon" />,
  GridFour: () => <svg data-testid="layout-grid-icon" />,
  List: () => <svg data-testid="list-icon" />,
}));

// Mock motion/react to avoid animation issues in tests
// TabsList uses LayoutGroup and motion.span internally
vi.mock("motion/react", () => ({
  LayoutGroup: ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    span: ({
      children,
      className,
      style,
    }: {
      children?: React.ReactNode;
      className?: string;
      style?: React.CSSProperties;
    }) => (
      <span className={className} style={style}>
        {children}
      </span>
    ),
  },
}));

function getButtonByText(text: string): HTMLButtonElement {
  const button = screen.getByText(text).closest("button");
  if (!button) {
    throw new Error(`Button containing "${text}" not found`);
  }
  return button;
}

describe("BoardViewToggle", () => {
  afterEach(() => {
    cleanup();
  });

  it("should render all three tab buttons", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    expect(screen.getByText("List")).toBeInTheDocument();
    expect(screen.getByText("Roadmap")).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
  });

  it("should mark roadmap tab as selected when view is roadmap", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    const roadmapButton = getButtonByText("Roadmap");
    expect(roadmapButton).toHaveAttribute("aria-selected", "true");

    const feedButton = getButtonByText("List");
    expect(feedButton).toHaveAttribute("aria-selected", "false");

    const milestonesButton = getButtonByText("Timeline");
    expect(milestonesButton).toHaveAttribute("aria-selected", "false");
  });

  it("should mark feed tab as selected when view is feed", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="feed" />);

    const feedButton = getButtonByText("List");
    expect(feedButton).toHaveAttribute("aria-selected", "true");

    const roadmapButton = getButtonByText("Roadmap");
    expect(roadmapButton).toHaveAttribute("aria-selected", "false");
  });

  it("should call onChange with roadmap when roadmap button is clicked", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="feed" />);

    const roadmapButton = getButtonByText("Roadmap");
    fireEvent.click(roadmapButton);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("roadmap");
  });

  it("should call onChange with feed when feed button is clicked", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    const feedButton = getButtonByText("List");
    fireEvent.click(feedButton);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("feed");
  });

  it("should call onChange with milestones when timeline button is clicked", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    const timelineButton = getButtonByText("Timeline");
    fireEvent.click(timelineButton);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("milestones");
  });

  it("should apply custom className", () => {
    const onChange = vi.fn();
    const { container } = render(
      <BoardViewToggle
        className="custom-class"
        onChange={onChange}
        view="roadmap"
      />
    );

    const toggleContainer = container.firstChild;
    expect(toggleContainer).toHaveClass("custom-class");
  });

  it("should render icons", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    expect(screen.getByTestId("layout-grid-icon")).toBeInTheDocument();
    expect(screen.getByTestId("list-icon")).toBeInTheDocument();
    expect(screen.getByTestId("flag-icon")).toBeInTheDocument();
  });

  it("should maintain stable callbacks across rerenders", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <BoardViewToggle onChange={onChange} view="roadmap" />
    );

    // Click a different tab to trigger onChange
    const feedButton = getButtonByText("List");
    fireEvent.click(feedButton);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("feed");

    // Rerender with updated view
    rerender(<BoardViewToggle onChange={onChange} view="feed" />);

    // Click another different tab
    const timelineButton = getButtonByText("Timeline");
    fireEvent.click(timelineButton);

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith("milestones");
  });

  it("should not call onChange when clicking already active view", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    const roadmapButton = getButtonByText("Roadmap");
    fireEvent.click(roadmapButton);

    // base-ui Tabs with controlled value does not fire onValueChange
    // when clicking the already-selected tab
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("BoardView type", () => {
  it("should accept valid view values", () => {
    const validViews: BoardView[] = ["roadmap", "feed", "milestones"];
    expect(validViews).toHaveLength(3);
    expect(validViews).toContain("roadmap");
    expect(validViews).toContain("feed");
    expect(validViews).toContain("milestones");
  });
});
