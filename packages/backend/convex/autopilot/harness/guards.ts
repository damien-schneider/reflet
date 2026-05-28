import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";

const VALIDATION_FAILURE_REASONS = [
  "missing_required_artifact",
  "missing_evidence",
  "private_user_folder",
  "local_state_tracked",
  "secret_detected",
] as const;

interface HarnessGuardStateInput {
  bridgeOnline: boolean;
  claudeAvailable: boolean;
  organizationId: Id<"organizations">;
  repoFullName: string;
  worktreeClean: boolean;
}

async function countPendingApprovals(
  ctx: { db: MutationCtx["db"] },
  organizationId: Id<"organizations">
): Promise<number> {
  const [documents, workItems] = await Promise.all([
    ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", organizationId).eq("needsReview", true)
      )
      .collect(),
    ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", organizationId).eq("needsReview", true)
      )
      .collect(),
  ]);
  return documents.length + workItems.length;
}

async function listRepoJobs(
  ctx: { db: MutationCtx["db"] },
  organizationId: Id<"organizations">,
  repoFullName: string
): Promise<Doc<"autopilotBridgeJobs">[]> {
  const jobs = await ctx.db
    .query("autopilotBridgeJobs")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .collect();
  return jobs.filter((job) => job.repoFullName === repoFullName);
}

function countOpenRefletPrs(jobs: Doc<"autopilotBridgeJobs">[]): number {
  return jobs.filter((job) => Boolean(job.prUrl) && job.status === "succeeded")
    .length;
}

function countLeadingFailures(
  jobs: Doc<"autopilotBridgeJobs">[],
  reasons: readonly string[]
): number {
  const sorted = [...jobs].sort(
    (left, right) => right.createdAt - left.createdAt
  );
  let count = 0;
  for (const job of sorted) {
    if (job.failureReason && reasons.includes(job.failureReason)) {
      count += 1;
      continue;
    }
    return count;
  }
  return count;
}

export async function readHarnessGuardState(
  ctx: { db: MutationCtx["db"] },
  input: HarnessGuardStateInput
) {
  const jobs = await listRepoJobs(
    ctx,
    input.organizationId,
    input.repoFullName
  );
  return {
    bridgeOnline: input.bridgeOnline,
    claudeAvailable: input.claudeAvailable,
    consecutiveNoopRuns: countLeadingFailures(jobs, ["noop_output"]),
    consecutiveValidatorFailures: countLeadingFailures(
      jobs,
      VALIDATION_FAILURE_REASONS
    ),
    openRefletPrs: countOpenRefletPrs(jobs),
    pendingApprovals: await countPendingApprovals(ctx, input.organizationId),
    worktreeClean: input.worktreeClean,
  };
}
