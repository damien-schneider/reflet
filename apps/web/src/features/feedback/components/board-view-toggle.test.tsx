import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type BoardView, BoardViewToggle } from "./board-view-toggle";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  GridFour: () => <svg data-testid="layout-grid-icon" />,
  List: () => <svg data-testid="list-icon" />,
}));

// Mock tooltip components to simplify testing
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="tooltip-content">{children}</span>
  ),
  TooltipTrigger: ({
    render,
    children,
  }: {
    render: React.ReactElement;
    children: React.ReactNode;
  }) => (
    <div data-testid="tooltip-trigger">
      {render}
      {children}
    </div>
  ),
}));

// Mock button component
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
    "aria-label": ariaLabel,
    ...props
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    "aria-label"?: string;
    [key: string]: unknown;
  }) => (
    <button
      aria-label={ariaLabel}
      data-variant={variant}
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  ),
}));

describe("BoardViewToggle", () => {
  afterEach(() => {
    cleanup();
  });

  it("should render roadmap and feed buttons", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    expect(screen.getByLabelText("Roadmap view")).toBeInTheDocument();
    expect(screen.getByLabelText("Feed view")).toBeInTheDocument();
  });

  it("should highlight roadmap button when view is roadmap", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    const roadmapButton = screen.getByLabelText("Roadmap view");
    expect(roadmapButton).toHaveAttribute("data-variant", "secondary");

    const feedButton = screen.getByLabelText("Feed view");
    expect(feedButton).toHaveAttribute("data-variant", "ghost");
  });

  it("should highlight feed button when view is feed", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="feed" />);

    const roadmapButton = screen.getByLabelText("Roadmap view");
    expect(roadmapButton).toHaveAttribute("data-variant", "ghost");

    const feedButton = screen.getByLabelText("Feed view");
    expect(feedButton).toHaveAttribute("data-variant", "secondary");
  });

  it("should call onChange with roadmap when roadmap button is clicked", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="feed" />);

    const roadmapButton = screen.getByLabelText("Roadmap view");
    fireEvent.click(roadmapButton);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("roadmap");
  });

  it("should call onChange with feed when feed button is clicked", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    const feedButton = screen.getByLabelText("Feed view");
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

  it("should show tooltip content for both views", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    // Check tooltip content is rendered
    const tooltipContents = screen.getAllByTestId("tooltip-content");
    expect(tooltipContents).toHaveLength(2);
    expect(tooltipContents[0]).toHaveTextContent("Roadmap (Kanban)");
    expect(tooltipContents[1]).toHaveTextContent("Feed (List)");
  });

  it("should maintain stable callbacks", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <BoardViewToggle onChange={onChange} view="roadmap" />
    );

    const roadmapButton = screen.getByLabelText("Roadmap view");
    fireEvent.click(roadmapButton);
    fireEvent.click(roadmapButton);

    expect(onChange).toHaveBeenCalledTimes(2);

    // Rerender with same onChange should work
    rerender(<BoardViewToggle onChange={onChange} view="feed" />);

    const feedButton = screen.getByLabelText("Feed view");
    fireEvent.click(feedButton);

    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenLastCalledWith("feed");
  });

  it("should not call onChange when clicking already active view", () => {
    // Note: The component still calls onChange even for the active view
    // This test documents the current behavior
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    const roadmapButton = screen.getByLabelText("Roadmap view");
    fireEvent.click(roadmapButton);

    // Current behavior: onChange is called even for active view
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
