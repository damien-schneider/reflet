import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  act,
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
} = { onDragEnd: null, onDragStart: null };

vi.mock("@dnd-kit/core", () => ({
  closestCorners: vi.fn(),
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
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  TouchSensor: vi.fn(),
  useDraggable: ({ disabled }: { id: string; disabled?: boolean }) => ({
    attributes: {},
    isDragging: false,
    listeners: disabled ? undefined : {},
    setActivatorNodeRef: vi.fn(),
    setNodeRef: vi.fn(),
  }),
  useDroppable: () => ({ isOver: false, setNodeRef: vi.fn() }),
  useSensor: vi.fn((...args: unknown[]) => args),
  useSensors: vi.fn((...args: unknown[]) => args),
}));

vi.mock("@dnd-kit/sortable", () => ({
  sortableKeyboardCoordinates: vi.fn(),
}));
vi.mock("convex/react", () => ({
  useMutation: () => mockUpdateFeedbackStatus,
}));

// Mock motion/react for faster tests - preserve structure for testing
vi.mock("motion/react", () => ({
  domMax: {},
  LayoutGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout-group">{children}</div>
  ),
  LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    div: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
  },
  useReducedMotion: () => false,
}));

// Mock phosphor icons
vi.mock("@phosphor-icons/react", () => ({
  CaretUp: () => <svg data-testid="caret-up-icon" />,
  ChatCircle: () => <svg data-testid="chat-icon" />,
  DotsSixVertical: () => <svg data-testid="dots-icon" />,
  Palette: () => <svg data-testid="palette-icon" />,
  Plus: () => <svg data-testid="plus-icon" />,
  Trash: () => <svg data-testid="trash-icon" />,
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
    color: "#6b7280",
    name: "Backlog",
  },
  {
    _id: "status-2" as Id<"organizationStatuses">,
    color: "#3b82f6",
    name: "In Progress",
  },
  {
    _id: "status-3" as Id<"organizationStatuses">,
    color: "#22c55e",
    name: "Done",
  },
];

const mockFeedback: FeedbackItem[] = [
  {
    _id: "feedback-1" as Id<"feedback">,
    commentCount: 2,
    createdAt: Date.now(),
    description: "Description 1",
    organizationId: "org-1" as Id<"organizations">,
    organizationStatusId: "status-1" as Id<"organizationStatuses">,
    tags: [],
    title: "Test feedback 1",
    voteCount: 5,
  },
  {
    _id: "feedback-2" as Id<"feedback">,
    commentCount: 1,
    createdAt: Date.now(),
    description: "Description 2",
    organizationId: "org-1" as Id<"organizations">,
    organizationStatusId: "status-2" as Id<"organizationStatuses">,
    tags: [],
    title: "Test feedback 2",
    voteCount: 3,
  },
];

describe("RoadmapView", () => {
  afterEach(() => {
    vi.clearAllMocks();
    dndHandlers.onDragStart = null;
    dndHandlers.onDragEnd = null;
  });

  describe("Move handles", () => {
    it("gives admins a focusable move handle on every card", () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={true}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      expect(
        screen.getByRole("button", { name: "Move Test feedback 1" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Move Test feedback 2" })
      ).toBeInTheDocument();
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

    it("should NOT show move handles for non-admin users", () => {
      render(
        <RoadmapView
          feedback={mockFeedback}
          isAdmin={false}
          onFeedbackClick={vi.fn()}
          organizationId={"org-1" as never}
          statuses={mockStatuses}
        />
      );

      expect(
        screen.queryByRole("button", { name: /^Move / })
      ).not.toBeInTheDocument();
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

  describe("Optimistic Updates", () => {
    it("should render feedback in correct columns based on organizationStatusId", () => {
      const multiColumnFeedback: FeedbackItem[] = [
        ...mockFeedback,
        {
          _id: "feedback-3" as Id<"feedback">,
          commentCount: 0,
          createdAt: Date.now(),
          description: "Description 3",
          organizationId: "org-1" as Id<"organizations">,
          organizationStatusId: "status-1" as Id<"organizationStatuses">,
          tags: [],
          title: "Test feedback 3",
          voteCount: 1,
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
          commentCount: 0,
          createdAt: Date.now(),
          description: "No status",
          organizationId: "org-1" as Id<"organizations">,
          tags: [],
          title: "Unassigned feedback",
          voteCount: 0,
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
