import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type BoardView, BoardViewToggle } from "./board-view-toggle";

vi.mock("@phosphor-icons/react", () => ({
  Flag: () => <svg data-testid="flag-icon" />,
  GridFour: () => <svg data-testid="layout-grid-icon" />,
  List: () => <svg data-testid="list-icon" />,
}));

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
  it("should render all three tab buttons", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    expect(screen.getByText("List")).toBeInTheDocument();
    expect(screen.getByText("Board")).toBeInTheDocument();
    expect(screen.getByText("Milestones")).toBeInTheDocument();
  });

  it("should mark roadmap tab as selected when view is roadmap", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    const roadmapButton = getButtonByText("Board");
    expect(roadmapButton).toHaveAttribute("aria-selected", "true");

    const feedButton = getButtonByText("List");
    expect(feedButton).toHaveAttribute("aria-selected", "false");

    const milestonesButton = getButtonByText("Milestones");
    expect(milestonesButton).toHaveAttribute("aria-selected", "false");
  });

  it("should mark feed tab as selected when view is feed", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="feed" />);

    const feedButton = getButtonByText("List");
    expect(feedButton).toHaveAttribute("aria-selected", "true");

    const roadmapButton = getButtonByText("Board");
    expect(roadmapButton).toHaveAttribute("aria-selected", "false");
  });

  it("should call onChange with roadmap when roadmap button is clicked", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="feed" />);

    const roadmapButton = getButtonByText("Board");
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

    const timelineButton = getButtonByText("Milestones");
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

    const feedButton = getButtonByText("List");
    fireEvent.click(feedButton);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("feed");

    rerender(<BoardViewToggle onChange={onChange} view="feed" />);

    const timelineButton = getButtonByText("Milestones");
    fireEvent.click(timelineButton);

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith("milestones");
  });

  it("should not call onChange when clicking already active view", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    const roadmapButton = getButtonByText("Board");
    fireEvent.click(roadmapButton);

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
