import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { FeedbackDetail } from "@/features/feedback/components/properties/property-types";
import { toId } from "@/lib/convex-helpers";
import { FeedbackMetadataBar } from "./feedback-metadata-bar";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useQuery: () => [],
}));
vi.mock("@/hooks/use-auth-guard", () => ({
  useAuthGuard: () => ({ guard: vi.fn(), isAuthenticated: true }),
}));
vi.mock("./copy-for-agents", () => ({ CopyForAgents: () => null }));

const now = Date.now();
const organizationId = toId("organizations", "organization-id");
const feedback: FeedbackDetail = {
  _creationTime: now,
  _id: toId("feedback", "feedback-id"),
  aiNeedsReview: 0.9,
  aiPriority: "critical",
  assignee: null,
  author: null,
  commentCount: 0,
  createdAt: now,
  description: "Cannot complete purchase",
  hasVoted: false,
  isApproved: false,
  isAuthor: false,
  isInternal: true,
  isMember: true,
  isPinned: false,
  needsClarification: false,
  organization: {
    _creationTime: now,
    _id: organizationId,
    createdAt: now,
    isPublic: true,
    name: "Project",
    slug: "project",
    subscriptionStatus: "none",
    subscriptionTier: "free",
  },
  organizationId,
  organizationStatus: null,
  priority: "high",
  role: "admin",
  status: "open",
  tags: [],
  title: "Checkout fails",
  updatedAt: now,
  userVoteType: null,
  voteCount: 3,
};

test("detail shows the human effective value and keeps publication distinct from clarification", () => {
  render(<FeedbackMetadataBar feedback={feedback} isAdmin />);
  expect(
    screen.getByRole("button", { name: "Priority: High. Human decision" })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Internal" })).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Ready to act" })
  ).toBeInTheDocument();
});

test("public detail omits private team assessments", () => {
  render(
    <FeedbackMetadataBar
      feedback={{ ...feedback, isMember: false, role: null }}
      isAdmin={false}
    />
  );
  expect(
    screen.queryByRole("button", { name: /Priority:/ })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Internal" })
  ).not.toBeInTheDocument();
});
