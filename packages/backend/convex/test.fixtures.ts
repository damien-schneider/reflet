import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export async function seedOrganization(
  ctx: MutationCtx,
  overrides: Partial<Doc<"organizations">> = {}
): Promise<Id<"organizations">> {
  return await ctx.db.insert("organizations", {
    createdAt: Date.now(),
    isPublic: true,
    name: "Acme",
    slug: "acme",
    subscriptionStatus: "none",
    subscriptionTier: "free",
    ...overrides,
  });
}

export async function seedFeedback(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  overrides: Partial<Doc<"feedback">> = {}
): Promise<Id<"feedback">> {
  const now = Date.now();
  return await ctx.db.insert("feedback", {
    commentCount: 0,
    createdAt: now,
    description: "Clicking save loses the draft",
    isApproved: true,
    isPinned: false,
    organizationId,
    status: "open",
    title: "Draft lost on save",
    updatedAt: now,
    voteCount: 0,
    ...overrides,
  });
}

export async function seedGithubConnection(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  overrides: Partial<Doc<"githubConnections">> = {}
): Promise<Id<"githubConnections">> {
  const now = Date.now();
  return await ctx.db.insert("githubConnections", {
    accountLogin: "acme",
    accountType: "organization",
    createdAt: now,
    installationId: "install-1",
    organizationId,
    repositoryFullName: "acme/app",
    status: "connected",
    updatedAt: now,
    ...overrides,
  });
}

export async function seedGithubIssue(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  githubConnectionId: Id<"githubConnections">,
  overrides: Partial<Doc<"githubIssues">> = {}
): Promise<Id<"githubIssues">> {
  const now = Date.now();
  return await ctx.db.insert("githubIssues", {
    githubConnectionId,
    githubCreatedAt: now,
    githubIssueId: "issue-1",
    githubIssueNumber: 42,
    githubLabels: [],
    githubUpdatedAt: now,
    htmlUrl: "https://github.com/acme/app/issues/42",
    lastSyncedAt: now,
    organizationId,
    state: "open",
    title: "Draft lost on save",
    ...overrides,
  });
}

export async function scheduledFunctionNames(
  ctx: MutationCtx
): Promise<string[]> {
  const scheduled = await ctx.db.system.query("_scheduled_functions").collect();
  return scheduled.map((job) => job.name);
}
