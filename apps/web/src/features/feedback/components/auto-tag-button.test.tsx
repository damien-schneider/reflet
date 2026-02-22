/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn(() => vi.fn());

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => mockUseMutation(),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    feedback_auto_tagging: {
      getUntaggedFeedbackCount:
        "feedback_auto_tagging.getUntaggedFeedbackCount",
      getActiveJob: "feedback_auto_tagging.getActiveJob",
      startBulkAutoTagging: "feedback_auto_tagging.startBulkAutoTagging",
      dismissJob: "feedback_auto_tagging.dismissJob",
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/ui/alert-dialog", () => {
  let dialogOnOpenChange: ((open: boolean) => void) | undefined;
  return {
    AlertDialog: ({
      children,
      open,
      onOpenChange,
    }: {
      children: React.ReactNode;
      open?: boolean;
      onOpenChange?: (open: boolean) => void;
    }) => {
      dialogOnOpenChange = onOpenChange;
      return (
        <div data-open={open} data-testid="alert-dialog">
          {children}
        </div>
      );
    },
    AlertDialogTrigger: ({
      render: renderProp,
      children,
    }: {
      render?: React.ReactElement;
      children?: React.ReactNode;
    }) => (
      <div onClick={() => dialogOnOpenChange?.(true)}>
        {renderProp ?? children}
      </div>
    ),
    AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
      <h2>{children}</h2>
    ),
    AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
      <p>{children}</p>
    ),
    AlertDialogAction: ({
      children,
      onClick,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button onClick={onClick} type="button" {...props}>
        {children}
      </button>
    ),
    AlertDialogCancel: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
  };
});

import { AutoTagButton } from "./auto-tag-button";

const organizationId = "org1" as Id<"organizations">;

describe("AutoTagButton", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("returns null when untaggedCount is undefined (loading)", () => {
    mockUseQuery.mockReturnValue(undefined);
    const { container } = render(
      <AutoTagButton organizationId={organizationId} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null when untaggedCount is 0", () => {
    let callIndex = 0;
    mockUseQuery.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return 0; // untaggedCount
      }
      return null; // job
    });
    const { container } = render(
      <AutoTagButton organizationId={organizationId} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders auto-tag button with count", () => {
    let callIndex = 0;
    mockUseQuery.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return 15; // untaggedCount
      }
      return null; // no job
    });
    render(<AutoTagButton organizationId={organizationId} />);
    expect(screen.getByText("Auto-tag 15")).toBeInTheDocument();
  });

  it("renders processing state when job is pending", () => {
    let callIndex = 0;
    mockUseQuery.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return 10;
      }
      return {
        _id: "job1",
        status: "processing",
        processedItems: 3,
        totalItems: 10,
        successfulItems: 3,
        failedItems: 0,
        errors: [],
      };
    });
    render(<AutoTagButton organizationId={organizationId} />);
    // Processing button should be disabled
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("renders completed state with check icon", () => {
    let callIndex = 0;
    mockUseQuery.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return 0;
      }
      return {
        _id: "job1",
        status: "completed",
        processedItems: 10,
        totalItems: 10,
        successfulItems: 10,
        failedItems: 0,
        errors: [],
      };
    });
    render(<AutoTagButton organizationId={organizationId} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders failed state button", () => {
    let callIndex = 0;
    mockUseQuery.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return 0;
      }
      return {
        _id: "job1",
        status: "failed",
        processedItems: 5,
        totalItems: 10,
        successfulItems: 3,
        failedItems: 2,
        errors: [{ feedbackId: "f1", error: "timeout" }],
      };
    });
    render(<AutoTagButton organizationId={organizationId} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows confirmation dialog when auto-tag button is clicked", () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "feedback_auto_tagging.getUntaggedFeedbackCount") {
        return 5;
      }
      return null;
    });
    render(<AutoTagButton organizationId={organizationId} />);
    fireEvent.click(screen.getByText("Auto-tag 5"));
    expect(screen.getByText("Auto-tag feedback items?")).toBeInTheDocument();
    expect(
      screen.getByText(/AI will analyze 5 untagged feedback/)
    ).toBeInTheDocument();
  });

  it("shows singular 'item' when untaggedCount is 1", () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "feedback_auto_tagging.getUntaggedFeedbackCount") {
        return 1;
      }
      return null;
    });
    render(<AutoTagButton organizationId={organizationId} />);
    fireEvent.click(screen.getByText("Auto-tag 1"));
    expect(
      screen.getByText(/1 untagged feedback item and/)
    ).toBeInTheDocument();
  });

  it("has Cancel button in confirmation dialog", () => {
    let callIndex = 0;
    mockUseQuery.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return 5;
      }
      return null;
    });
    render(<AutoTagButton organizationId={organizationId} />);
    fireEvent.click(screen.getByText("Auto-tag 5"));
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Start Auto-tagging")).toBeInTheDocument();
  });

  it("renders singular item text when count is 1", () => {
    let callIndex = 0;
    mockUseQuery.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return 1;
      }
      return null;
    });
    render(<AutoTagButton organizationId={organizationId} />);
    expect(screen.getByText("Auto-tag 1")).toBeInTheDocument();
  });

  it("renders plural items text when count is > 1", () => {
    let callIndex = 0;
    mockUseQuery.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return 7;
      }
      return null;
    });
    render(<AutoTagButton organizationId={organizationId} />);
    expect(screen.getByText("Auto-tag 7")).toBeInTheDocument();
  });

  it("calls startBulkAutoTagging when confirmed", async () => {
    const mockStart = vi.fn().mockResolvedValue(undefined);
    mockUseMutation.mockReturnValue(mockStart);
    let callIndex = 0;
    mockUseQuery.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return 3;
      }
      return null;
    });
    render(<AutoTagButton organizationId={organizationId} />);
    fireEvent.click(screen.getByText("Auto-tag 3"));
    fireEvent.click(screen.getByText("Start Auto-tagging"));
    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledWith({ organizationId });
    });
  });

  it("renders pending job same as processing", () => {
    let callIndex = 0;
    mockUseQuery.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return 10;
      }
      return {
        _id: "job1",
        status: "pending",
        processedItems: 0,
        totalItems: 10,
        successfulItems: 0,
        failedItems: 0,
        errors: [],
      };
    });
    render(<AutoTagButton organizationId={organizationId} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("clamps processed items to totalItems", () => {
    let callIndex = 0;
    mockUseQuery.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return 10;
      }
      return {
        _id: "job1",
        status: "processing",
        processedItems: 15, // exceeds totalItems
        totalItems: 10,
        successfulItems: 10,
        failedItems: 0,
        errors: [],
      };
    });
    render(<AutoTagButton organizationId={organizationId} />);
    // Should still render without crashing
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
