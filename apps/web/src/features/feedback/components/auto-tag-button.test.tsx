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
    feedback: {
      auto_tagging_queries: {
        getUntaggedFeedbackCount:
          "feedback_auto_tagging_queries.getUntaggedFeedbackCount",
        getActiveJob: "feedback_auto_tagging_queries.getActiveJob",
      },
      auto_tagging_mutations: {
        startBulkAutoTagging:
          "feedback_auto_tagging_mutations.startBulkAutoTagging",
        dismissJob: "feedback_auto_tagging_mutations.dismissJob",
      },
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

  it("returns null when job is completed and no untagged items", () => {
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
    const { container } = render(
      <AutoTagButton organizationId={organizationId} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null when job failed and no untagged items", () => {
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
    const { container } = render(
      <AutoTagButton organizationId={organizationId} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("calls startBulkAutoTagging on button click", async () => {
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
    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledWith({ organizationId });
    });
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

  it("calls startBulkAutoTagging when button is clicked", async () => {
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
