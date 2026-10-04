import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { FeedbackStatusValue } from "../shared/validators";
import { applyReleaseStatusToLinkedFeedback } from "./feedback_status";
import type { ReleaseCommit } from "./tableFields";

export interface PublishReleaseOptions {
  actorId: string;
  /** Live release: email subscribers, notify voters, push to GitHub. Off for backfilled history. */
  announce: boolean;
  feedbackStatus?: FeedbackStatusValue;
  publishedAt: number;
}

const CLEARED_SCHEDULE = {
  scheduledBy: undefined,
  scheduledFeedbackStatus: undefined,
  scheduledJobId: undefined,
  scheduledPublishAt: undefined,
} as const;

async function cancelPendingScheduledPublish(
  ctx: MutationCtx,
  release: Doc<"releases">
): Promise<void> {
  if (!release.scheduledJobId) {
    return;
  }
  const job = await ctx.db.system.get(release.scheduledJobId);
  if (job?.state.kind === "pending") {
    await ctx.scheduler.cancel(release.scheduledJobId);
  }
}

export async function publishRelease(
  ctx: MutationCtx,
  release: Doc<"releases">,
  options: PublishReleaseOptions
): Promise<void> {
  if (release.publishedAt) {
    throw new Error("Release is already published");
  }

  await cancelPendingScheduledPublish(ctx, release);
  await ctx.db.patch(release._id, {
    ...CLEARED_SCHEDULE,
    publishedAt: options.publishedAt,
    updatedAt: Date.now(),
  });

  if (options.feedbackStatus) {
    await applyReleaseStatusToLinkedFeedback(
      ctx,
      release._id,
      options.feedbackStatus,
      options.actorId
    );
  }

  if (!options.announce) {
    return;
  }

  const releaseId = release._id;
  await ctx.scheduler.runAfter(
    0,
    internal.changelog.notifications.sendReleaseNotifications,
    { releaseId }
  );
  await ctx.scheduler.runAfter(
    0,
    internal.integrations.github.node_actions.pushReleaseToGithub,
    { releaseId }
  );
  await ctx.scheduler.runAfter(
    0,
    internal.notifications.shipped.sendShippedNotifications,
    { releaseId }
  );
}

export async function unpublishRelease(
  ctx: MutationCtx,
  release: Doc<"releases">
): Promise<void> {
  await cancelPendingScheduledPublish(ctx, release);
  await ctx.db.patch(release._id, {
    ...CLEARED_SCHEDULE,
    publishedAt: undefined,
    updatedAt: Date.now(),
  });
}

async function deleteReleaseChildren(
  ctx: MutationCtx,
  releaseId: Id<"releases">
): Promise<void> {
  const children = [
    ...(await ctx.db
      .query("releaseFeedback")
      .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
      .collect()),
    ...(await ctx.db
      .query("releaseCommits")
      .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
      .collect()),
    ...(await ctx.db
      .query("releaseDrafts")
      .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
      .collect()),
  ];
  for (const child of children) {
    await ctx.db.delete(child._id);
  }
}

export async function deleteRelease(
  ctx: MutationCtx,
  release: Doc<"releases">
): Promise<void> {
  await cancelPendingScheduledPublish(ctx, release);
  await deleteReleaseChildren(ctx, release._id);

  const mirrors = await ctx.db
    .query("githubReleases")
    .withIndex("by_reflet_release", (q) => q.eq("refletReleaseId", release._id))
    .collect();
  for (const mirror of mirrors) {
    await ctx.db.patch(mirror._id, { refletReleaseId: undefined });
  }

  await ctx.db.delete(release._id);
}

export async function findReleaseByVersion(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  version: string
): Promise<Doc<"releases"> | null> {
  return await ctx.db
    .query("releases")
    .withIndex("by_org_version", (q) =>
      q.eq("organizationId", organizationId).eq("version", version)
    )
    .first();
}

export async function assertVersionAvailable(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  version: string | undefined,
  releaseId?: Id<"releases">
): Promise<void> {
  if (!version) {
    return;
  }
  const existing = await findReleaseByVersion(ctx, organizationId, version);
  if (existing && existing._id !== releaseId) {
    throw new Error(`Version ${version} is already used by another release`);
  }
}

function newestCommitTime(commits: ReleaseCommit[]): number | undefined {
  const commitTimes = commits
    .map((commit) => Date.parse(commit.date))
    .filter((time) => !Number.isNaN(time));
  return commitTimes.length === 0 ? undefined : Math.max(...commitTimes);
}

export function releaseSourceDate(
  release: Doc<"releases">,
  snapshot: Doc<"releaseCommits"> | null
): number {
  const newestCommitAt = snapshot
    ? newestCommitTime(snapshot.commits)
    : undefined;
  return newestCommitAt ?? release.createdAt;
}
