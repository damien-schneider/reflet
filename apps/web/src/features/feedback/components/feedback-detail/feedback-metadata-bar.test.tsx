import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

test("the properties panel names each field and returns focus after inspecting publication", async () => {
  render(
    <FeedbackMetadataBar
      feedback={{ ...feedback, aiJunk: 0.92 }}
      isAdmin
      layout="panel"
    />
  );
  const publication = screen.getByRole("group", { name: "Publication" });
  const publicationTrigger = within(publication).getByRole("button", {
    name: "Internal",
  });
  expect(screen.getByRole("group", { name: "Status" })).toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Assignee" })).toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Deadline" })).toBeInTheDocument();
  expect(
    within(screen.getByRole("group", { name: "Priority" })).getByRole(
      "button",
      { name: "Priority: High. Human decision" }
    )
  ).toBeInTheDocument();
  await userEvent.tab();
  await userEvent.tab();
  await userEvent.tab();
  expect(publicationTrigger).toHaveFocus();
  await userEvent.keyboard("{Enter}");
  expect(screen.getByText("Visible to the team")).toBeVisible();
  await userEvent.keyboard("{Escape}");
  expect(publicationTrigger).toHaveFocus();
  const rejectionTrigger = within(
    screen.getByRole("group", { name: "AI rejection" })
  ).getByRole("button", { name: "AI suggests rejection: 92%" });
  await userEvent.click(rejectionTrigger);
  expect(screen.getByText("Discard recommendation")).toBeVisible();
  await userEvent.keyboard("{Escape}");
  expect(rejectionTrigger).toHaveFocus();
});
