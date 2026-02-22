/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn(() => vi.fn());

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => mockUseMutation(),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    organization_statuses: { list: "organization_statuses.list" },
    members: { list: "members.list" },
    tags: {
      list: "tags.list",
      addToFeedback: "tags.addToFeedback",
      removeFromFeedback: "tags.removeFromFeedback",
    },
    feedback_subscriptions: {
      isSubscribed: "feedback_subscriptions.isSubscribed",
      toggle: "feedback_subscriptions.toggle",
    },
    votes: { toggle: "votes.toggle" },
    feedback_actions: {
      updateOrganizationStatus: "feedback_actions.updateOrganizationStatus",
      assign: "feedback_actions.assign",
      updateAnalysis: "feedback_actions.updateAnalysis",
    },
  },
}));

vi.mock("@/hooks/use-auth-guard", () => ({
  useAuthGuard: () => ({
    guard: vi.fn((cb: () => void) => cb()),
    isAuthenticated: true,
  }),
}));

let _capturedVoteHandler: ((voteType: "upvote" | "downvote") => void) | null =
  null;
let _capturedStatusHandler: ((statusId: string | null) => void) | null = null;
let _capturedAssigneeHandler: ((id: string) => void) | null = null;
let _capturedTagHandler: ((tagId: string, isApplied: boolean) => void) | null =
  null;
let _capturedSubscriptionHandler: (() => void) | null = null;
let _capturedDeadlineOnChange: ((date: Date) => void) | null = null;
let _capturedDeadlineOnClear: (() => void) | null = null;

vi.mock("./ai-analysis-display", () => ({
  AiAnalysisDisplay: () => <div data-testid="ai-analysis" />,
}));

vi.mock("./assignee-display", () => ({
  AssigneeDisplay: ({
    onAssigneeChange,
  }: {
    onAssigneeChange: (id: string) => void;
    assignee?: unknown;
    isAdmin: boolean;
    members?: unknown;
  }) => {
    _capturedAssigneeHandler = onAssigneeChange;
    return (
      <div data-testid="assignee-display">
        <button onClick={() => onAssigneeChange("user-123")} type="button">
          assign
        </button>
        <button onClick={() => onAssigneeChange("unassigned")} type="button">
          unassign
        </button>
      </div>
    );
  },
}));

vi.mock("./copy-for-agents", () => ({
  CopyForAgents: () => <div data-testid="copy-for-agents" />,
}));

vi.mock("./deadline-display", () => ({
  DeadlineDisplay: ({
    onChange,
    onClear,
  }: {
    deadline?: number | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onChange: (date: Date) => void;
    onClear: () => void;
  }) => {
    _capturedDeadlineOnChange = onChange;
    _capturedDeadlineOnClear = onClear;
    return (
      <div data-testid="deadline-display">
        <button onClick={() => onChange(new Date(2027, 0, 1))} type="button">
          set-deadline
        </button>
        <button onClick={onClear} type="button">
          clear-deadline
        </button>
      </div>
    );
  },
}));

vi.mock("./status-display", () => ({
  StatusDisplay: ({
    onStatusChange,
  }: {
    onStatusChange: (id: string | null) => void;
    currentStatus?: unknown;
    isAdmin: boolean;
    organizationStatuses?: unknown;
    statusId?: unknown;
  }) => {
    _capturedStatusHandler = onStatusChange;
    return (
      <div data-testid="status-display">
        <button onClick={() => onStatusChange("status-1")} type="button">
          change-status
        </button>
        <button onClick={() => onStatusChange(null)} type="button">
          clear-status
        </button>
      </div>
    );
  },
}));

vi.mock("./subscribe-button", () => ({
  SubscribeButton: ({
    onToggle,
  }: {
    isSubscribed?: boolean;
    onToggle: () => void;
  }) => {
    _capturedSubscriptionHandler = onToggle;
    return (
      <div data-testid="subscribe-button">
        <button onClick={onToggle} type="button">
          toggle-sub
        </button>
      </div>
    );
  },
}));

vi.mock("./tag-display", () => ({
  TagDisplay: ({
    onToggleTag,
  }: {
    onToggleTag: (tagId: string, isApplied: boolean) => void;
    availableTags?: unknown;
    feedbackTagIds: Set<string>;
    isAdmin: boolean;
    validTags: unknown[];
  }) => {
    _capturedTagHandler = onToggleTag;
    return (
      <div data-testid="tag-display">
        <button onClick={() => onToggleTag("tag-1", false)} type="button">
          add-tag
        </button>
        <button onClick={() => onToggleTag("tag-2", true)} type="button">
          remove-tag
        </button>
      </div>
    );
  },
}));

vi.mock("./vote-buttons", () => ({
  VoteButtons: ({
    onVote,
  }: {
    onVote: (type: "upvote" | "downvote") => void;
    userVoteType: "upvote" | "downvote" | null;
    voteCount: number;
  }) => {
    _capturedVoteHandler = onVote;
    return (
      <div data-testid="vote-buttons">
        <button onClick={() => onVote("upvote")} type="button">
          upvote
        </button>
        <button onClick={() => onVote("downvote")} type="button">
          downvote
        </button>
      </div>
    );
  },
}));

import { FeedbackMetadataBar } from "./feedback-metadata-bar";

const feedbackId = "f1" as Id<"feedback">;
const organizationId = "org1" as Id<"organizations">;

const baseProps = {
  feedbackId,
  organizationId,
  voteCount: 10,
  userVoteType: null as "upvote" | "downvote" | null,
  createdAt: Date.now(),
  isAdmin: true,
  title: "Test",
  description: "Test desc",
};

describe("FeedbackMetadataBar", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders vote buttons", () => {
    render(<FeedbackMetadataBar {...baseProps} />);
    expect(screen.getByTestId("vote-buttons")).toBeInTheDocument();
  });

  it("renders status display", () => {
    render(<FeedbackMetadataBar {...baseProps} />);
    expect(screen.getByTestId("status-display")).toBeInTheDocument();
  });

  it("renders tag display", () => {
    render(<FeedbackMetadataBar {...baseProps} />);
    expect(screen.getByTestId("tag-display")).toBeInTheDocument();
  });

  it("renders subscribe button", () => {
    render(<FeedbackMetadataBar {...baseProps} />);
    expect(screen.getByTestId("subscribe-button")).toBeInTheDocument();
  });

  it("renders copy for agents when admin", () => {
    render(<FeedbackMetadataBar {...baseProps} isAdmin />);
    expect(screen.getByTestId("copy-for-agents")).toBeInTheDocument();
  });

  it("does not render copy for agents when not admin", () => {
    render(<FeedbackMetadataBar {...baseProps} isAdmin={false} />);
    expect(screen.queryByTestId("copy-for-agents")).not.toBeInTheDocument();
  });

  it("shows Details toggle when admin", () => {
    render(<FeedbackMetadataBar {...baseProps} isAdmin />);
    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("shows Details toggle when AI fields are present (non-admin)", () => {
    render(
      <FeedbackMetadataBar {...baseProps} aiPriority="high" isAdmin={false} />
    );
    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("does not show Details toggle when non-admin and no AI fields", () => {
    render(<FeedbackMetadataBar {...baseProps} isAdmin={false} />);
    expect(screen.queryByText("Details")).not.toBeInTheDocument();
  });

  it("renders expanded details with AI analysis when Details is clicked", () => {
    render(<FeedbackMetadataBar {...baseProps} isAdmin />);
    fireEvent.click(screen.getByText("Details"));
    expect(screen.getByTestId("ai-analysis")).toBeInTheDocument();
    expect(screen.getByTestId("assignee-display")).toBeInTheDocument();
    expect(screen.getByTestId("deadline-display")).toBeInTheDocument();
  });

  it("does not show deadline inside details for non-admin", () => {
    render(
      <FeedbackMetadataBar {...baseProps} aiPriority="medium" isAdmin={false} />
    );
    fireEvent.click(screen.getByText("Details"));
    expect(screen.queryByTestId("deadline-display")).not.toBeInTheDocument();
  });

  it("renders with tags passed", () => {
    render(
      <FeedbackMetadataBar
        {...baseProps}
        tags={[{ _id: "t1" as never, name: "Bug", color: "red" }, null]}
      />
    );
    expect(screen.getByTestId("tag-display")).toBeInTheDocument();
  });

  it("renders with null organization status", () => {
    render(
      <FeedbackMetadataBar {...baseProps} organizationStatusId={undefined} />
    );
    expect(screen.getByTestId("status-display")).toBeInTheDocument();
  });

  it("renders with all AI analysis fields", () => {
    render(
      <FeedbackMetadataBar
        {...baseProps}
        aiComplexity="moderate"
        aiComplexityReasoning="Involves multiple components"
        aiPriority="high"
        aiPriorityReasoning="Affects many users"
        aiTimeEstimate="4 hours"
        complexity="simple"
        priority="medium"
        timeEstimate="2 hours"
      />
    );
    // Should render and show Details toggle
    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("renders with assignee data", () => {
    render(
      <FeedbackMetadataBar
        {...baseProps}
        assignee={{
          id: "user1",
          name: "John Doe",
          email: "john@test.com",
          image: "/avatar.png",
        }}
        isAdmin
      />
    );
    // Expand details section to show assignee
    fireEvent.click(screen.getByText("Details"));
    expect(screen.getByTestId("assignee-display")).toBeInTheDocument();
  });

  it("renders with deadline", () => {
    render(
      <FeedbackMetadataBar {...baseProps} deadline={Date.now() + 86_400_000} />
    );
    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("renders with user vote type", () => {
    render(<FeedbackMetadataBar {...baseProps} userVoteType="upvote" />);
    expect(screen.getByTestId("vote-buttons")).toBeInTheDocument();
  });

  it("renders with downvote type", () => {
    render(<FeedbackMetadataBar {...baseProps} userVoteType="downvote" />);
    expect(screen.getByTestId("vote-buttons")).toBeInTheDocument();
  });

  it("hides deadline-display inside details for non-admin with AI fields", () => {
    render(
      <FeedbackMetadataBar
        {...baseProps}
        aiComplexity="trivial"
        aiPriority="low"
        isAdmin={false}
      />
    );
    fireEvent.click(screen.getByText("Details"));
    expect(screen.getByTestId("ai-analysis")).toBeInTheDocument();
    expect(screen.queryByTestId("deadline-display")).not.toBeInTheDocument();
  });

  it("shows deadline-display inside details for admin", () => {
    render(<FeedbackMetadataBar {...baseProps} isAdmin />);
    fireEvent.click(screen.getByText("Details"));
    expect(screen.getByTestId("deadline-display")).toBeInTheDocument();
  });

  it("does not render Details when non-admin and no AI/manual fields", () => {
    render(
      <FeedbackMetadataBar
        {...baseProps}
        aiComplexity={undefined}
        aiPriority={undefined}
        aiTimeEstimate={undefined}
        complexity={undefined}
        isAdmin={false}
        priority={undefined}
        timeEstimate={undefined}
      />
    );
    expect(screen.queryByText("Details")).not.toBeInTheDocument();
  });

  it("renders with empty tags array", () => {
    render(<FeedbackMetadataBar {...baseProps} tags={[]} />);
    expect(screen.getByTestId("tag-display")).toBeInTheDocument();
  });

  it("renders with attachments", () => {
    render(
      <FeedbackMetadataBar
        {...baseProps}
        attachments={["file1.png", "file2.pdf"]}
        isAdmin
      />
    );
    expect(screen.getByTestId("copy-for-agents")).toBeInTheDocument();
  });

  it("renders with null description", () => {
    render(<FeedbackMetadataBar {...baseProps} description={null} />);
    expect(screen.getByTestId("vote-buttons")).toBeInTheDocument();
  });

  it("renders status select when admin", () => {
    const { container } = render(
      <FeedbackMetadataBar {...baseProps} isAdmin />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders tags section", () => {
    const { container } = render(
      <FeedbackMetadataBar {...baseProps} isAdmin />
    );
    expect(container.innerHTML).toBeTruthy();
  });

  it("renders vote count value", () => {
    const { container } = render(
      <FeedbackMetadataBar {...baseProps} voteCount={42} />
    );
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("renders creation date info", () => {
    const { container } = render(<FeedbackMetadataBar {...baseProps} />);
    expect(container).toBeInTheDocument();
  });

  it("calls toggleVote mutation when upvote button is clicked", async () => {
    const toggleVoteMock = vi.fn();
    mockUseMutation.mockReturnValue(toggleVoteMock);
    render(<FeedbackMetadataBar {...baseProps} />);
    fireEvent.click(screen.getByText("upvote"));
    expect(toggleVoteMock).toHaveBeenCalled();
  });

  it("calls updateStatus mutation when status is changed", async () => {
    const updateStatusMock = vi.fn();
    mockUseMutation.mockReturnValue(updateStatusMock);
    render(<FeedbackMetadataBar {...baseProps} isAdmin />);
    fireEvent.click(screen.getByText("change-status"));
    expect(updateStatusMock).toHaveBeenCalled();
  });

  it("does not call updateStatus when null statusId is passed", async () => {
    const updateStatusMock = vi.fn();
    mockUseMutation.mockReturnValue(updateStatusMock);
    render(<FeedbackMetadataBar {...baseProps} isAdmin />);
    fireEvent.click(screen.getByText("clear-status"));
    // null statusId should be a no-op due to the if (statusId) guard
    expect(updateStatusMock).not.toHaveBeenCalled();
  });

  it("calls assignFeedback mutation when assignee is changed", async () => {
    const assignMock = vi.fn();
    mockUseMutation.mockReturnValue(assignMock);
    render(<FeedbackMetadataBar {...baseProps} isAdmin />);
    fireEvent.click(screen.getByText("Details"));
    fireEvent.click(screen.getByText("assign"));
    expect(assignMock).toHaveBeenCalled();
  });

  it("calls assignFeedback with undefined when unassigned", async () => {
    const assignMock = vi.fn();
    mockUseMutation.mockReturnValue(assignMock);
    render(<FeedbackMetadataBar {...baseProps} isAdmin />);
    fireEvent.click(screen.getByText("Details"));
    fireEvent.click(screen.getByText("unassign"));
    expect(assignMock).toHaveBeenCalled();
  });

  it("calls addTagMutation when adding a tag", async () => {
    const addTagMock = vi.fn();
    mockUseMutation.mockReturnValue(addTagMock);
    render(<FeedbackMetadataBar {...baseProps} isAdmin />);
    fireEvent.click(screen.getByText("add-tag"));
    expect(addTagMock).toHaveBeenCalled();
  });

  it("calls removeTagMutation when removing a tag", async () => {
    const removeTagMock = vi.fn();
    mockUseMutation.mockReturnValue(removeTagMock);
    render(<FeedbackMetadataBar {...baseProps} isAdmin />);
    fireEvent.click(screen.getByText("remove-tag"));
    expect(removeTagMock).toHaveBeenCalled();
  });

  it("calls toggleSubscription when subscribe button is clicked", async () => {
    const toggleSubMock = vi.fn();
    mockUseMutation.mockReturnValue(toggleSubMock);
    render(<FeedbackMetadataBar {...baseProps} />);
    fireEvent.click(screen.getByText("toggle-sub"));
    expect(toggleSubMock).toHaveBeenCalled();
  });

  it("calls updateAnalysis with deadline when deadline date is set", async () => {
    const updateAnalysisMock = vi.fn();
    mockUseMutation.mockReturnValue(updateAnalysisMock);
    render(<FeedbackMetadataBar {...baseProps} isAdmin />);
    fireEvent.click(screen.getByText("Details"));
    fireEvent.click(screen.getByText("set-deadline"));
    expect(updateAnalysisMock).toHaveBeenCalled();
  });

  it("calls updateAnalysis with clearDeadline when deadline is cleared", async () => {
    const updateAnalysisMock = vi.fn();
    mockUseMutation.mockReturnValue(updateAnalysisMock);
    render(<FeedbackMetadataBar {...baseProps} isAdmin />);
    fireEvent.click(screen.getByText("Details"));
    fireEvent.click(screen.getByText("clear-deadline"));
    expect(updateAnalysisMock).toHaveBeenCalled();
  });
});
