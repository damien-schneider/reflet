import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock feedback data
const mockFeedback = {
  _id: "js7cqbnxcv3zrgt3jj0ef3gnt17zcz79" as Id<"feedback">,
  title: "Test Feedback Title",
  description: "Test feedback description",
  voteCount: 5,
  commentCount: 2,
  hasVoted: false,
  isPinned: false,
  isAuthor: false,
  role: "member" as const,
  createdAt: Date.now() - 86_400_000,
  organizationStatusId: "status-1" as Id<"organizationStatuses">,
  organizationId: "org-1" as Id<"organizations">,
  tags: [{ _id: "tag1", name: "Bug", color: "#ff0000" }],
};

const mockOrg = {
  _id: "org-1" as Id<"organizations">,
  name: "My Organization",
  slug: "my-organization",
  isPublic: true,
  subscriptionTier: "free" as const,
  primaryColor: "#6366f1",
};

const mockStatuses = [
  {
    _id: "status-1" as Id<"organizationStatuses">,
    name: "New",
    color: "#6b7280",
    order: 0,
  },
];

const mockComments: unknown[] = [];

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn(() => vi.fn());

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => mockUseMutation(),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    feedback: { get: "feedback.get" },
    feedback_actions: { assign: "feedback_actions.assign" },
    organizations: { getBySlug: "organizations.getBySlug" },
    organization_statuses: { list: "organization_statuses.list" },
    comments: { list: "comments.list" },
    members: {
      getMembership: "members.getMembership",
      list: "members.list",
    },
    votes: { toggle: "votes.toggle" },
    tags: { list: "tags.list" },
  },
}));

// Mock React.use for async params
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");
  return {
    ...actual,
    use: (
      _promise: Promise<{ orgSlug: string; feedbackId: Id<"feedback"> }>
    ) => ({
      orgSlug: "my-organization",
      feedbackId: "js7cqbnxcv3zrgt3jj0ef3gnt17zcz79" as Id<"feedback">,
    }),
  };
});

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock date-fns
vi.mock("date-fns", () => ({
  formatDistanceToNow: () => "1 day ago",
}));

// Mock phosphor icons
vi.mock("@phosphor-icons/react", () => ({
  ArrowLeft: () => <span data-testid="arrow-left" />,
  CaretUp: () => <span data-testid="caret-up" />,
  ChatCircle: () => <span data-testid="chat-circle" />,
  PushPin: () => <span data-testid="push-pin" />,
  User: () => <span data-testid="user-icon" />,
}));

// Mock UI components
vi.mock("@/components/ui/card", () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
  CardContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="card-content">
      {children}
    </div>
  ),
  CardHeader: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="card-header">
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    style,
    variant,
  }: {
    children: React.ReactNode;
    style?: React.CSSProperties;
    variant?: string;
  }) => (
    <span data-testid="badge" data-variant={variant} style={style}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    className,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button
      className={className}
      data-size={size}
      data-variant={variant}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <span className={className} data-testid="avatar">
      {children}
    </span>
  ),
  AvatarImage: ({ src }: { src?: string }) => (
    <span data-src={src} data-testid="avatar-image" />
  ),
  AvatarFallback: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <span className={className} data-testid="avatar-fallback">
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
  }) => <div data-testid="select">{children}</div>,
  SelectTrigger: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="select-trigger">
      {children}
    </div>
  ),
  SelectValue: ({
    children,
  }: {
    children?: React.ReactNode;
    placeholder?: string;
  }) => <span data-testid="select-value">{children}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children }: { children: React.ReactNode; value: string }) => (
    <div data-testid="select-item">{children}</div>
  ),
}));

vi.mock("@/components/ui/typography", () => ({
  H1: ({ children }: { children: React.ReactNode; variant?: string }) => (
    <h1>{children}</h1>
  ),
  H2: ({ children }: { children: React.ReactNode; variant?: string }) => (
    <h2>{children}</h2>
  ),
  Muted: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="muted">{children}</span>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) =>
    args.filter((arg) => typeof arg === "string").join(" "),
}));

// Import component after mocks
import FeedbackDetailPage from "./page";

describe("FeedbackDetailPage", () => {
  beforeEach(() => {
    mockUseQuery.mockImplementation((queryFn, args) => {
      if (args === "skip") {
        return undefined;
      }
      const queryName = String(queryFn);
      if (queryName === "feedback.get") {
        return mockFeedback;
      }
      if (queryName === "organizations.getBySlug") {
        return mockOrg;
      }
      if (queryName === "organization_statuses.list") {
        return mockStatuses;
      }
      if (queryName === "comments.list") {
        return mockComments;
      }
      if (queryName === "members.getMembership") {
        return { role: "member" };
      }
      if (queryName === "members.list") {
        return [];
      }
      if (queryName === "tags.list") {
        return [];
      }
      return undefined;
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should render the feedback detail page with title", async () => {
    render(
      <FeedbackDetailPage
        params={Promise.resolve({
          orgSlug: "my-organization",
          feedbackId: "js7cqbnxcv3zrgt3jj0ef3gnt17zcz79" as Id<"feedback">,
        })}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Test Feedback Title")).toBeInTheDocument();
    });
  });

  it("should display the feedback description", async () => {
    render(
      <FeedbackDetailPage
        params={Promise.resolve({
          orgSlug: "my-organization",
          feedbackId: "js7cqbnxcv3zrgt3jj0ef3gnt17zcz79" as Id<"feedback">,
        })}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Test feedback description")).toBeInTheDocument();
    });
  });

  it("should display vote count", async () => {
    render(
      <FeedbackDetailPage
        params={Promise.resolve({
          orgSlug: "my-organization",
          feedbackId: "js7cqbnxcv3zrgt3jj0ef3gnt17zcz79" as Id<"feedback">,
        })}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  it("should display the status badge", async () => {
    render(
      <FeedbackDetailPage
        params={Promise.resolve({
          orgSlug: "my-organization",
          feedbackId: "js7cqbnxcv3zrgt3jj0ef3gnt17zcz79" as Id<"feedback">,
        })}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("New")).toBeInTheDocument();
    });
  });

  it("should display tags", async () => {
    render(
      <FeedbackDetailPage
        params={Promise.resolve({
          orgSlug: "my-organization",
          feedbackId: "js7cqbnxcv3zrgt3jj0ef3gnt17zcz79" as Id<"feedback">,
        })}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Bug")).toBeInTheDocument();
    });
  });

  it("should show not found message when feedback is null", async () => {
    // Override mock for this test
    mockUseQuery.mockImplementation((queryFn, args) => {
      if (args === "skip") {
        return undefined;
      }
      const queryName = String(queryFn);
      if (queryName === "feedback.get") {
        return null;
      }
      if (queryName === "organizations.getBySlug") {
        return mockOrg;
      }
      if (queryName === "members.getMembership") {
        return { role: "member" };
      }
      return undefined;
    });

    render(
      <FeedbackDetailPage
        params={Promise.resolve({
          orgSlug: "my-organization",
          feedbackId: "nonexistent-id" as Id<"feedback">,
        })}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Feedback not found")).toBeInTheDocument();
    });
  });

  it("should have a back link to the dashboard", async () => {
    render(
      <FeedbackDetailPage
        params={Promise.resolve({
          orgSlug: "my-organization",
          feedbackId: "js7cqbnxcv3zrgt3jj0ef3gnt17zcz79" as Id<"feedback">,
        })}
      />
    );

    await waitFor(() => {
      const backLink = screen.getByText("Back");
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest("a")).toHaveAttribute(
        "href",
        "/dashboard/my-organization"
      );
    });
  });
});
