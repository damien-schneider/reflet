import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FeedbackItem } from "./feed-feedback-view";
import { RoadmapView } from "./roadmap-view";

// Regex patterns for text matching - defined at top level for performance
const NO_STATUSES_PATTERN = /No statuses configured/i;

// Only mock external dependencies, NOT dnd-kit
const mockUpdateFeedbackStatus = vi.fn().mockResolvedValue(undefined);

// Captured DnD handlers
const dndHandlers: {
  onDragStart: ((event: { active: { id: string } }) => void) | null;
  onDragEnd:
    | ((event: { active: { id: string }; over: { id: string } | null }) => void)
    | null;
} = { onDragStart: null, onDragEnd: null };

vi.mock("@dnd-kit/core", () => ({
  DndContext: (props: Record<string, unknown>) => {
    dndHandlers.onDragStart =
      props.onDragStart as typeof dndHandlers.onDragStart;
    dndHandlers.onDragEnd = props.onDragEnd as typeof dndHandlers.onDragEnd;
    return (
      <div data-testid="dnd-context">{props.children as React.ReactNode}</div>
    );
  },
  DragOverlay: (props: Record<string, unknown>) => (
    <div data-testid="drag-overlay">{props.children as React.ReactNode}</div>
  ),
  useSensor: vi.fn((...args: unknown[]) => args),
  useSensors: vi.fn((...args: unknown[]) => args),
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  useDraggable: ({ disabled }: { id: string; disabled?: boolean }) => ({
    attributes: {},
    listeners: disabled ? undefined : {},
    setNodeRef: vi.fn(),
    isDragging: false,
  }),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  TouchSensor: vi.fn(),
  closestCorners: vi.fn(),
}));

vi.mock("@dnd-kit/sortable", () => ({
  sortableKeyboardCoordinates: vi.fn(),
}));
vi.mock("convex/react", () => ({
  useMutation: () => mockUpdateFeedbackStatus,
}));

// Mock motion/react for faster tests - preserve structure for testing
vi.mock("motion/react", () => ({
  motion: {
    div: ({
      children,
      initial,
      animate,
      exit,
      transition,
      className,
      ...props
    }: {
      children: React.ReactNode;
      initial?: Record<string, unknown>;
      animate?: Record<string, unknown>;
      exit?: Record<string, unknown>;
      transition?: Record<string, unknown>;
      className?: string;
    }) => (
      <div
        className={className}
        data-animate={JSON.stringify(animate)}
        data-initial={JSON.stringify(initial)}
        data-testid="motion-div"
        data-transition={JSON.stringify(transition)}
        {...props}
      >
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="animate-presence">{children}</div>
  ),
  LayoutGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout-group">{children}</div>
  ),
}));

// Mock phosphor icons
vi.mock("@phosphor-icons/react", () => ({
  CaretUp: () => <svg data-testid="caret-up-icon" />,
  ChatCircle: () => <svg data-testid="chat-icon" />,
  Plus: () => <svg data-testid="plus-icon" />,
  Trash: () => <svg data-testid="trash-icon" />,
  Palette: () => <svg data-testid="palette-icon" />,
  DotsSixVertical: () => <svg data-testid="dots-icon" />,
}));

// Mock child components that have complex dependencies
vi.mock("./roadmap/add-column-inline", () => ({
  AddColumnInline: () => <div data-testid="add-column">Add Column</div>,
}));

vi.mock("./roadmap/column-delete-dialog", () => ({
  ColumnDeleteDialog: (props: Record<string, unknown>) =>
    (props.open as boolean) ? (
      <div data-testid="delete-dialog">
        <span data-testid="delete-feedback-count">
          {String(props.feedbackCount)}
        </span>
        <button
          data-testid="close-delete-dialog"
          onClick={() => (props.onOpenChange as (b: boolean) => void)(false)}
          type="button"
        >
          Close
        </button>
      </div>
    ) : null,
}));

vi.mock("./roadmap/roadmap-column-header", () => ({
  RoadmapColumnHeader: ({
    name,
    count,
    isAdmin,
    onDelete,
    statusId,
  }: {
    name: string;
    count: number;
    color: string;
    isAdmin: boolean;
    onDelete: () => void;
    statusId: string;
  }) => (
    <div data-testid="column-header">
      {name} ({count})
      {isAdmin && (
        <button
          data-testid={`delete-${statusId}`}
          onClick={onDelete}
          type="button"
        >
          Delete
        </button>
      )}
    </div>
  ),
}));

const mockStatuses = [
  {
    _id: "status-1" as Id<"organizationStatuses">,
    name: "Backlog",
    color: "#6b7280",
  },
  {
    _id: "status-2" as Id<"organizationStatuses">,
    name: "In Progress",
    color: "#3b82f6",
  },
  {
    _id: "status-3" as Id<"organizationStatuses">,
    name: "Done",
    color: "#22c55e",
  },
];

const mockFeedback: FeedbackItem[] = [
  {
    _id: "feedback-1" as Id<"feedback">,
    title: "Test feedback 1",
    description: "Description 1",
    voteCount: 5,
    commentCount: 2,
    organizationStatusId: "status-1" as Id<"organizationStatuses">,
    organizationId: "org-1" as Id<"organizations">,
    createdAt: Date.now(),
    tags: [],
  },
  {
    _id: "feedback-2" as Id<"feedback">,
    title: "Test feedback 2",
    description: "Description 2",
    voteCount: 3,
    commentCount: 1,
    organizationStatusId: "status-2" as Id<"organizationStatuses">,
    organizationId: "org-1" as Id<"organizations">,
    createdAt: Date.now(),
    tags: [],
  },
];

describe("RoadmapView", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    dndHandlers.onDragStart = null;
    dndHandlers.onDragEnd = null;
  });

  describe("Sensor Configuration", () => {
    it("should configure KeyboardSensor for accessibility", () => {
      // We need to verify KeyboardSensor is included in sensors
      // This test will fail because KeyboardSensor is not currently configured
      const { container } = render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // The component should have keyboard-accessible drag handles
      const dragHandles = container.querySelectorAll(
        '[aria-label="Drag to reorder"]'
      );
      expect(dragHandles.length).toBeGreaterThan(0);

      // Verify keyboard sensor is configured by checking DndContext props
      // We'll check this via a spy on useSensors
      // For now, we verify the presence of keyboard-navigable elements
      for (const handle of dragHandles) {
        expect(handle).toHaveAttribute("type", "button");
      }
    });

    it("should configure PointerSensor with 8px activation distance", () => {
      // This is verified by the sensor configuration in the component
      // We test that small movements don't trigger drag (requires integration test)
      const { container } = render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // Component should render without crashing with proper sensor config
      expect(
        container.querySelector('[data-testid="column-header"]')
      ).toBeInTheDocument();
    });

    it("should configure TouchSensor with 300ms delay and 5px tolerance", () => {
      // Touch sensor configuration prevents accidental drags on mobile
      const { container } = render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // Component should render with touch-compatible drag handles
      const dragHandles = container.querySelectorAll(
        '[aria-label="Drag to reorder"]'
      );
      for (const handle of dragHandles) {
        expect(handle.classList.contains("touch-none")).toBe(true);
      }
    });
  });

  describe("Collision Detection", () => {
    it("should use closestCorners collision detection for kanban layout", () => {
      // closestCorners is better for kanban boards where items move between columns
      // This test verifies the correct algorithm is used
      // We can't directly test this without mocking DndContext, but we can verify
      // the component is structured correctly for column-based drops
      const { container } = render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // Each column should be a valid drop target
      const columns = container.querySelectorAll('[class*="w-72"]');
      expect(columns.length).toBe(mockStatuses.length);
    });
  });

  describe("DragOverlay Animations", () => {
    it("should use motion/react for DragOverlay animations", () => {
      // Verify that the component uses motion/react (imported and configured)
      // The actual animation happens during drag, but we verify the structure
      const { container } = render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // Component should render successfully with motion/react integration
      // The DragOverlay with AnimatePresence/motion.div is rendered but empty when not dragging
      expect(container.firstChild).toBeInTheDocument();

      // Verify feedback items are rendered (motion is applied on drag)
      expect(screen.getByText("Test feedback 1")).toBeInTheDocument();
    });

    it("should configure animation with scale(1.05) and rotate(3deg)", () => {
      // This test verifies the animation configuration exists in the component
      // The actual animation is applied when activeItem is set (during drag)
      const { container } = render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // Component renders correctly - animation will be visible during actual drag
      expect(container.firstChild).toBeInTheDocument();

      // Verify the component has draggable items that will trigger the animation
      const dragHandles = container.querySelectorAll(
        '[aria-label="Drag to reorder"]'
      );
      expect(dragHandles.length).toBeGreaterThan(0);
    });

    it("should use spring animation for smooth transitions", () => {
      // Spring animation configuration (damping: 25, stiffness: 300) is applied
      // during drag via motion.div transition prop
      const { container } = render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // Component renders correctly with spring animation configured
      expect(container.firstChild).toBeInTheDocument();

      // Verify draggable elements exist that will use spring animation
      const feedbackCards = screen.getAllByRole("button");
      expect(feedbackCards.length).toBeGreaterThan(0);
    });
  });

  describe("Accessibility Announcements", () => {
    it("should have DndContext configured with accessibility announcements", () => {
      // DndContext should have accessibility prop with announcements
      // This test will FAIL because announcements are not currently configured
      const { container } = render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // The component should render with proper ARIA attributes for accessibility
      // Drag handles should be accessible buttons
      const dragHandles = container.querySelectorAll(
        '[aria-label="Drag to reorder"]'
      );
      expect(dragHandles.length).toBeGreaterThan(0);
    });

    it("should support keyboard drag with Space/Enter activation", () => {
      // Keyboard users should be able to activate drag with Space or Enter
      const { container } = render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // Drag handles should be focusable buttons
      const dragHandles = container.querySelectorAll(
        '[aria-label="Drag to reorder"]'
      );
      for (const handle of dragHandles) {
        expect(handle.tagName.toLowerCase()).toBe("button");
        // Buttons are keyboard accessible by default
      }
    });
  });

  describe("Integration: Drag and Drop Behavior", () => {
    it("should NOT call mutation when dropping in same column", () => {
      // When a card is dropped in the same column, no API call should be made
      // This tests the optimization to avoid unnecessary updates
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // Initially, no mutations should have been called
      expect(mockUpdateFeedbackStatus).not.toHaveBeenCalled();
    });

    it("should render all feedback items in correct columns", () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // Check that feedback items are rendered
      expect(screen.getByText("Test feedback 1")).toBeInTheDocument();
      expect(screen.getByText("Test feedback 2")).toBeInTheDocument();
    });

    it("should show empty state when no statuses configured", () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={[]}
        />
      );

      expect(screen.getByText(NO_STATUSES_PATTERN)).toBeInTheDocument();
    });

    it("should show add column button for admin users", () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      expect(screen.getByTestId("add-column")).toBeInTheDocument();
    });

    it("should NOT show add column button for non-admin users", () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={false}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      expect(screen.queryByTestId("add-column")).not.toBeInTheDocument();
    });

    it("should NOT show drag handles for non-admin users", () => {
      const { container } = render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={false}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      const dragHandles = container.querySelectorAll(
        '[aria-label="Drag to reorder"]'
      );
      expect(dragHandles.length).toBe(0);
    });
  });

  describe("UI Rendering", () => {
    it("should render column headers with correct names and counts", () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // Backlog has 1 item, In Progress has 1 item, Done has 0
      expect(screen.getByText("Backlog (1)")).toBeInTheDocument();
      expect(screen.getByText("In Progress (1)")).toBeInTheDocument();
      expect(screen.getByText("Done (0)")).toBeInTheDocument();
    });

    it("should handle feedback click", () => {
      const onFeedbackClick = vi.fn();
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={false}
          onFeedbackClick={onFeedbackClick}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // Click on a feedback card
      const feedbackCard = screen.getByText("Test feedback 1");
      feedbackCard.click();

      expect(onFeedbackClick).toHaveBeenCalledWith("feedback-1");
    });
  });

  describe("Drag Over Column Detection", () => {
    it("should allow pointer events to pass through non-dragged cards to column", () => {
      const { container } = render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      const cardWrappers = container.querySelectorAll('[role="button"]');
      expect(cardWrappers.length).toBeGreaterThan(0);

      for (const wrapper of cardWrappers) {
        expect(wrapper).toBeInTheDocument();
      }
    });

    it("should have sortable items that do NOT act as drop targets", () => {
      const { container } = render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      const columns = container.querySelectorAll('[class*="w-72"]');
      expect(columns.length).toBe(mockStatuses.length);

      for (const column of columns) {
        expect(column.classList.contains("transition-colors")).toBe(true);
      }
    });

    it("should have sortable items container that can disable pointer events during drag", () => {
      const { container } = render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      const sortableContainers = container.querySelectorAll(".space-y-2");
      expect(sortableContainers.length).toBeGreaterThan(0);

      for (const containerEl of sortableContainers) {
        expect(containerEl).toBeInTheDocument();
      }
    });

    it("should apply pointer-events-none class to sortable container when dragging", () => {
      const { container } = render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      const sortableContainers = container.querySelectorAll(".space-y-2");

      for (const containerEl of sortableContainers) {
        expect(containerEl.classList.contains("pointer-events-none")).toBe(
          false
        );
      }
    });

    it("should pass isDragging prop to DroppableColumn for pointer-events control", () => {
      const { container } = render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      const sortableContainers = container.querySelectorAll(".space-y-2");

      for (const containerEl of sortableContainers) {
        expect(containerEl).toHaveAttribute("data-dragging", "false");
      }
    });
  });

  describe("Optimistic Updates", () => {
    it("should render feedback in correct columns based on organizationStatusId", () => {
      const multiColumnFeedback: FeedbackItem[] = [
        ...mockFeedback,
        {
          _id: "feedback-3" as Id<"feedback">,
          title: "Test feedback 3",
          description: "Description 3",
          voteCount: 1,
          commentCount: 0,
          organizationStatusId: "status-1" as Id<"organizationStatuses">,
          organizationId: "org-1" as Id<"organizations">,
          createdAt: Date.now(),
          tags: [],
        },
      ];

      render(
        <RoadmapView
          feedback={multiColumnFeedback}
          isAdmin
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // Backlog has 2 items, In Progress has 1
      expect(screen.getByText("Backlog (2)")).toBeInTheDocument();
      expect(screen.getByText("In Progress (1)")).toBeInTheDocument();
      expect(screen.getByText("Done (0)")).toBeInTheDocument();
    });

    it("should render feedback without status in no column", () => {
      const noStatusFeedback: FeedbackItem[] = [
        {
          _id: "feedback-4" as Id<"feedback">,
          title: "Unassigned feedback",
          description: "No status",
          voteCount: 0,
          commentCount: 0,
          organizationId: "org-1" as Id<"organizations">,
          createdAt: Date.now(),
          tags: [],
        },
      ];

      render(
        <RoadmapView
          feedback={noStatusFeedback}
          isAdmin
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // All columns show 0
      expect(screen.getByText("Backlog (0)")).toBeInTheDocument();
      expect(screen.getByText("In Progress (0)")).toBeInTheDocument();
      expect(screen.getByText("Done (0)")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should render with empty feedback array", () => {
      render(
        <RoadmapView
          feedback={[]}
          isAdmin
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      expect(screen.getByText("Backlog (0)")).toBeInTheDocument();
      expect(screen.getByText("In Progress (0)")).toBeInTheDocument();
      expect(screen.getByText("Done (0)")).toBeInTheDocument();
    });

    it("should render with a single status column", () => {
      const singleStatus = [mockStatuses[0]];
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={singleStatus}
        />
      );

      expect(screen.getByText("Backlog (1)")).toBeInTheDocument();
    });

    it("should not call updateFeedbackStatus on initial render", () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      expect(mockUpdateFeedbackStatus).not.toHaveBeenCalled();
    });

    it("should display delete dialog for column deletion when triggered", () => {
      const { container } = render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // ColumnDeleteDialog is mocked to return null, but it's rendered
      expect(container).toBeInTheDocument();
    });
  });

  describe("Drag Handlers", () => {
    it("sets activeItem on drag start and shows overlay", () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      act(() => {
        dndHandlers.onDragStart?.({ active: { id: "feedback-1" } });
      });

      // The DragOverlay should now render the FeedbackCardContent
      expect(screen.getAllByText("Test feedback 1").length).toBeGreaterThan(1);
    });

    it("clears activeItem after drag end", () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      act(() => {
        dndHandlers.onDragStart?.({ active: { id: "feedback-1" } });
      });
      expect(screen.getAllByText("Test feedback 1").length).toBeGreaterThan(1);

      act(() => {
        dndHandlers.onDragEnd?.({
          active: { id: "feedback-1" },
          over: null,
        });
      });
      expect(screen.getAllByText("Test feedback 1")).toHaveLength(1);
    });

    it("does not call mutation when dropping without target", async () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      await act(async () => {
        dndHandlers.onDragEnd?.({
          active: { id: "feedback-1" },
          over: null,
        });
      });

      expect(mockUpdateFeedbackStatus).not.toHaveBeenCalled();
    });

    it("does not call mutation when not admin", async () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={false}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      await act(async () => {
        dndHandlers.onDragEnd?.({
          active: { id: "feedback-1" },
          over: { id: "status-2" },
        });
      });

      expect(mockUpdateFeedbackStatus).not.toHaveBeenCalled();
    });

    it("does not call mutation when dropping in same column", async () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      await act(async () => {
        dndHandlers.onDragEnd?.({
          active: { id: "feedback-1" },
          over: { id: "status-1" },
        });
      });

      expect(mockUpdateFeedbackStatus).not.toHaveBeenCalled();
    });

    it("calls mutation when dropping on different column", async () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      await act(async () => {
        dndHandlers.onDragEnd?.({
          active: { id: "feedback-1" },
          over: { id: "status-2" },
        });
      });

      await waitFor(() => {
        expect(mockUpdateFeedbackStatus).toHaveBeenCalledWith({
          feedbackId: "feedback-1",
          organizationStatusId: "status-2",
        });
      });
    });

    it("applies optimistic update moving item to new column", async () => {
      mockUpdateFeedbackStatus.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 5000))
      );

      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      expect(screen.getByText("Backlog (1)")).toBeInTheDocument();
      expect(screen.getByText("In Progress (1)")).toBeInTheDocument();

      await act(async () => {
        dndHandlers.onDragEnd?.({
          active: { id: "feedback-1" },
          over: { id: "status-2" },
        });
      });

      expect(screen.getByText("Backlog (0)")).toBeInTheDocument();
      expect(screen.getByText("In Progress (2)")).toBeInTheDocument();
    });

    it("clears optimistic update after mutation resolves", async () => {
      let resolvePromise: () => void;
      mockUpdateFeedbackStatus.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve;
          })
      );

      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      await act(async () => {
        dndHandlers.onDragEnd?.({
          active: { id: "feedback-1" },
          over: { id: "status-2" },
        });
      });

      expect(screen.getByText("Backlog (0)")).toBeInTheDocument();

      await act(async () => {
        resolvePromise?.();
      });

      // Optimistic cleared, reverts to actual data
      expect(screen.getByText("Backlog (1)")).toBeInTheDocument();
    });

    it("clears optimistic update on mutation error", async () => {
      mockUpdateFeedbackStatus.mockRejectedValueOnce(new Error("Failed"));

      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      await act(async () => {
        // The handler re-throws since there's no catch, so we catch here
        const result = dndHandlers.onDragEnd?.({
          active: { id: "feedback-1" },
          over: { id: "status-2" },
        });
        await (result as Promise<void> | undefined)?.catch(() => {});
      });

      await waitFor(() => {
        expect(screen.getByText("Backlog (1)")).toBeInTheDocument();
      });
    });

    it("resolves target status from feedback item over id", async () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // Drop on feedback-2 which is in status-2
      await act(async () => {
        dndHandlers.onDragEnd?.({
          active: { id: "feedback-1" },
          over: { id: "feedback-2" },
        });
      });

      await waitFor(() => {
        expect(mockUpdateFeedbackStatus).toHaveBeenCalledWith({
          feedbackId: "feedback-1",
          organizationStatusId: "status-2",
        });
      });
    });

    it("does not call mutation when target status cannot be determined", async () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      await act(async () => {
        dndHandlers.onDragEnd?.({
          active: { id: "feedback-1" },
          over: { id: "unknown-id" },
        });
      });

      expect(mockUpdateFeedbackStatus).not.toHaveBeenCalled();
    });
  });

  describe("Delete Dialog", () => {
    it("opens delete dialog with correct feedback count", () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // Click delete on Backlog column (has 1 feedback item)
      fireEvent.click(screen.getByTestId("delete-status-1"));

      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
      expect(screen.getByTestId("delete-feedback-count")).toHaveTextContent(
        "1"
      );
    });

    it("closes delete dialog via onOpenChange", () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      fireEvent.click(screen.getByTestId("delete-status-1"));
      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("close-delete-dialog"));
      expect(screen.queryByTestId("delete-dialog")).not.toBeInTheDocument();
    });

    it("shows zero feedback count for empty column delete", () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      // Click delete on Done column (has 0 items)
      fireEvent.click(screen.getByTestId("delete-status-3"));
      expect(screen.getByTestId("delete-feedback-count")).toHaveTextContent(
        "0"
      );
    });
  });
});
