import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type BoardView, BoardViewToggle } from "./board-view-toggle";

// Mock phosphor icons
vi.mock("@phosphor-icons/react", () => ({
  GridFour: () => <svg data-testid="layout-grid-icon" />,
  List: () => <svg data-testid="list-icon" />,
}));

// Mock motion/react to avoid animation issues in tests
vi.mock("motion/react", () => ({
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

  it("should render roadmap and feed buttons", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    expect(screen.getByText("Roadmap")).toBeInTheDocument();
    expect(screen.getByText("List")).toBeInTheDocument();
  });

  it("should highlight roadmap button when view is roadmap", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    const roadmapButton = getButtonByText("Roadmap");
    expect(roadmapButton).toHaveClass("text-foreground");

    const feedButton = getButtonByText("List");
    expect(feedButton).toHaveClass("text-muted-foreground");
  });

  it("should highlight feed button when view is feed", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="feed" />);

    const roadmapButton = getButtonByText("Roadmap");
    expect(roadmapButton).toHaveClass("text-muted-foreground");

    const feedButton = getButtonByText("List");
    expect(feedButton).toHaveClass("text-foreground");
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
  });

  it("should maintain stable callbacks", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <BoardViewToggle onChange={onChange} view="roadmap" />
    );

    const roadmapButton = getButtonByText("Roadmap");
    fireEvent.click(roadmapButton);
    fireEvent.click(roadmapButton);

    expect(onChange).toHaveBeenCalledTimes(2);

    // Rerender with same onChange should work
    rerender(<BoardViewToggle onChange={onChange} view="feed" />);

    const feedButton = getButtonByText("List");
    fireEvent.click(feedButton);

    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenLastCalledWith("feed");
  });

  it("should call onChange even when clicking already active view", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    const roadmapButton = getButtonByText("Roadmap");
    fireEvent.click(roadmapButton);

    expect(onChange).toHaveBeenCalledWith("roadmap");
  });
});

describe("BoardView type", () => {
  it("should accept valid view values", () => {
    const validViews: BoardView[] = ["roadmap", "feed"];
    expect(validViews).toHaveLength(2);
    expect(validViews).toContain("roadmap");
    expect(validViews).toContain("feed");
  });
});
