import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoadmapView } from "./roadmap-view";

// Mock dnd-kit
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dnd-context">{children}</div>
  ),
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  closestCenter: vi.fn(),
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  useSensor: vi.fn(),
  useSensors: () => [],
  PointerSensor: vi.fn(),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => "",
    },
  },
}));

// Mock phosphor icons
vi.mock("@phosphor-icons/react", () => ({
  CaretUp: () => <svg data-testid="caret-up-icon" />,
  ChatCircle: () => <svg data-testid="chat-icon" />,
  Plus: () => <svg data-testid="plus-icon" />,
  Trash: () => <svg data-testid="trash-icon" />,
  Palette: () => <svg data-testid="palette-icon" />,
}));

// Mock Convex
vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
}));

// Mock child components that have complex dependencies
vi.mock("./roadmap/add-column-inline", () => ({
  AddColumnInline: () => <div data-testid="add-column">Add Column</div>,
}));

vi.mock("./roadmap/column-delete-dialog", () => ({
  ColumnDeleteDialog: () => null,
}));

vi.mock("./roadmap/roadmap-column-header", () => ({
  RoadmapColumnHeader: ({
    name,
    count,
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
    </div>
  ),
}));

const mockStatuses = [
  { _id: "status-1", name: "Backlog", color: "#6b7280" },
  { _id: "status-2", name: "In Progress", color: "#3b82f6" },
  { _id: "status-3", name: "Done", color: "#22c55e" },
];

const mockFeedback = [
  {
    _id: "feedback-1",
    title: "Test feedback 1",
    description: "Description 1",
    voteCount: 5,
    commentCount: 2,
    organizationStatusId: "status-1",
    createdAt: Date.now(),
    tags: [],
  },
  {
    _id: "feedback-2",
    title: "Test feedback 2",
    description: "Description 2",
    voteCount: 3,
    commentCount: 1,
    organizationStatusId: "status-2",
    createdAt: Date.now(),
    tags: [],
  },
];

describe("RoadmapView", () => {
  afterEach(() => {
    cleanup();
  });

  it("should have overflow-x-auto on the scroll container to handle column overflow", () => {
    const { container } = render(
      <RoadmapView
        feedback={mockFeedback}
        isAdmin={false}
        onFeedbackClick={vi.fn()}
        organizationId={"org-1" as never}
        statuses={mockStatuses}
      />
    );

    // Find the flex container with columns
    const scrollContainer = container.querySelector(".overflow-x-auto");
    expect(scrollContainer).toBeInTheDocument();
  });

  it("should have overflow-hidden wrapper to prevent horizontal overflow propagation", () => {
    const { container } = render(
      <RoadmapView
        feedback={mockFeedback}
        isAdmin={false}
        onFeedbackClick={vi.fn()}
        organizationId={"org-1" as never}
        statuses={mockStatuses}
      />
    );

    // The root wrapper must have overflow-hidden to contain horizontal overflow
    // and prevent it from propagating to parent scroll containers.
    const rootWrapper = container.firstElementChild;
    expect(rootWrapper).toBeInTheDocument();
    expect(rootWrapper?.classList.contains("overflow-hidden")).toBe(true);
  });
});
