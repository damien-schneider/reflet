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

const { mockDismissJob, mockStartBulkAutoTagging, mockToast } = vi.hoisted(
  () => ({
    mockDismissJob: vi.fn().mockResolvedValue(undefined),
    mockStartBulkAutoTagging: vi.fn().mockResolvedValue(undefined),
    mockToast: {
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
    },
  })
);
const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (reference: string) =>
    reference === "feedback_auto_tagging.startBulkAutoTagging"
      ? mockStartBulkAutoTagging
      : mockDismissJob,
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    feedback: {
      auto_tagging: {
        dismissJob: "feedback_auto_tagging.dismissJob",
        getActiveJob: "feedback_auto_tagging.getActiveJob",
        getUntaggedFeedbackCount:
          "feedback_auto_tagging.getUntaggedFeedbackCount",
        startBulkAutoTagging: "feedback_auto_tagging.startBulkAutoTagging",
      },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: mockToast,
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
        return 0;
      }
      return null;
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
        return 15;
      }
      return null;
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
        errors: [],
        failedItems: 0,
        processedItems: 3,
        status: "processing",
        successfulItems: 3,
        totalItems: 10,
      };
    });
    render(<AutoTagButton organizationId={organizationId} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("toasts and dismisses a completed job", async () => {
    let jobStatus: "completed" | "processing" = "processing";
    mockUseQuery.mockImplementation((reference: string) => {
      if (reference === "feedback_auto_tagging.getUntaggedFeedbackCount") {
        return 1;
      }
      return {
        _id: "job1",
        errors: [],
        failedItems: 0,
        processedItems: 10,
        status: jobStatus,
        successfulItems: 10,
        totalItems: 10,
      };
    });
    const { rerender } = render(
      <AutoTagButton organizationId={organizationId} />
    );

    jobStatus = "completed";
    rerender(<AutoTagButton organizationId={organizationId} />);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Auto-tagging complete", {
        description: "10 feedback items tagged",
      });
      expect(mockDismissJob).toHaveBeenCalledWith({ jobId: "job1" });
    });
  });

  it("toasts and dismisses a failed job", async () => {
    let jobStatus: "failed" | "processing" = "processing";
    mockUseQuery.mockImplementation((reference: string) => {
      if (reference === "feedback_auto_tagging.getUntaggedFeedbackCount") {
        return 1;
      }
      return {
        _id: "job1",
        errors: [{ error: "timeout", feedbackId: "f1" }],
        failedItems: 2,
        processedItems: 5,
        status: jobStatus,
        successfulItems: 3,
        totalItems: 10,
      };
    });
    const { rerender } = render(
      <AutoTagButton organizationId={organizationId} />
    );

    jobStatus = "failed";
    rerender(<AutoTagButton organizationId={organizationId} />);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Auto-tagging failed", {
        description: "3 tagged, 2 failed",
      });
      expect(mockDismissJob).toHaveBeenCalledWith({ jobId: "job1" });
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

  it("calls startBulkAutoTagging when clicked", async () => {
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
      expect(mockStartBulkAutoTagging).toHaveBeenCalledWith({ organizationId });
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
        errors: [],
        failedItems: 0,
        processedItems: 0,
        status: "pending",
        successfulItems: 0,
        totalItems: 10,
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
        errors: [],
        failedItems: 0,
        processedItems: 15,
        status: "processing",
        successfulItems: 10,
        totalItems: 10,
      };
    });
    render(<AutoTagButton organizationId={organizationId} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
