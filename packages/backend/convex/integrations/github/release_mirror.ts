import { type Infer, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import {
  findReleaseByVersion,
  publishRelease,
} from "../../changelog/release_lifecycle";
import { isGithubReleaseOutdated } from "./release_sync_state";

export const githubReleaseSnapshotValidator = v.object({
  body: v.optional(v.string()),
  createdAt: v.number(),
  githubReleaseId: v.string(),
  htmlUrl: v.string(),
  isDraft: v.boolean(),
  isPrerelease: v.boolean(),
  name: v.optional(v.string()),
  publishedAt: v.optional(v.number()),
  tagName: v.string(),
});

export type GithubReleaseSnapshot = Infer<
  typeof githubReleaseSnapshotValidator
>;

export interface ImportPublication {
  actorId: string;
  announce: boolean;
}

type GithubProse = Pick<Doc<"githubReleases">, "body" | "name" | "tagName">;

type GithubProseOutcome =
  | { kind: "unchanged" }
  | { kind: "proposed" }
  | { kind: "applied"; prose: Pick<Doc<"releases">, "description" | "title"> };

const githubReleaseTitle = (release: GithubProse): string =>
  release.name || release.tagName;

const githubReleaseDescription = (release: GithubProse): string =>
  release.body ?? "";

function releaseProseEquals(
  release: Pick<Doc<"releases">, "description" | "title">,
  githubRelease: GithubProse
): boolean {
  return (
    (release.description ?? "") === githubReleaseDescription(githubRelease) &&
    release.title === githubReleaseTitle(githubRelease)
  );
}

async function proposeGithubProse(
  ctx: MutationCtx,
  release: Doc<"releases">,
  githubRelease: GithubProse
): Promise<void> {
  await ctx.runMutation(internal.changelog.release_drafts.recordGithubDraft, {
    description: githubReleaseDescription(githubRelease),
    releaseId: release._id,
    title: githubReleaseTitle(githubRelease),
  });
}

export async function findMirror(
  ctx: QueryCtx,
  connectionId: Id<"githubConnections">,
  githubReleaseId: string
): Promise<Doc<"githubReleases"> | null> {
  return await ctx.db
    .query("githubReleases")
    .withIndex("by_github_release_id", (q) =>
      q
        .eq("githubConnectionId", connectionId)
        .eq("githubReleaseId", githubReleaseId)
    )
    .first();
}

async function findLinkedRelease(
  ctx: QueryCtx,
  mirror: Pick<
    Doc<"githubReleases">,
    "githubReleaseId" | "organizationId" | "refletReleaseId"
  >
): Promise<Doc<"releases"> | null> {
  if (mirror.refletReleaseId) {
    return await ctx.db.get(mirror.refletReleaseId);
  }
  return await ctx.db
    .query("releases")
    .withIndex("by_github_release", (q) =>
      q
        .eq("organizationId", mirror.organizationId)
        .eq("githubReleaseId", mirror.githubReleaseId)
    )
    .first();
}

export async function upsertMirror(
  ctx: MutationCtx,
  connection: Doc<"githubConnections">,
  snapshot: GithubReleaseSnapshot
): Promise<{
  mirror: Doc<"githubReleases">;
  previous: Doc<"githubReleases"> | null;
}> {
  const previous = await findMirror(
    ctx,
    connection._id,
    snapshot.githubReleaseId
  );
  const linkedRelease = await findLinkedRelease(ctx, {
    githubReleaseId: snapshot.githubReleaseId,
    organizationId: connection.organizationId,
    refletReleaseId: previous?.refletReleaseId,
  });
  const fields = {
    ...snapshot,
    lastSyncedAt: Date.now(),
    refletReleaseId: linkedRelease?._id,
  };

  if (previous) {
    await ctx.db.patch(previous._id, fields);
  }
  const mirrorId =
    previous?._id ??
    (await ctx.db.insert("githubReleases", {
      ...fields,
      githubConnectionId: connection._id,
      organizationId: connection.organizationId,
    }));
  const mirror = await ctx.db.get(mirrorId);
  if (!mirror) {
    throw new Error("GitHub release mirror vanished while saving");
  }
  return { mirror, previous };
}

async function linkReleaseToMirror(
  ctx: MutationCtx,
  release: Doc<"releases">,
  mirror: Doc<"githubReleases">
): Promise<void> {
  await ctx.db.patch(release._id, {
    githubHtmlUrl: mirror.htmlUrl,
    githubReleaseId: mirror.githubReleaseId,
  });
  await ctx.db.patch(mirror._id, { refletReleaseId: release._id });
  if (!(release.syncedFromGithub || releaseProseEquals(release, mirror))) {
    await proposeGithubProse(ctx, release, mirror);
  }
}

async function insertImportedRelease(
  ctx: MutationCtx,
  mirror: Doc<"githubReleases">
): Promise<Doc<"releases">> {
  const now = Date.now();
  const releaseId = await ctx.db.insert("releases", {
    createdAt: now,
    description: mirror.body,
    githubHtmlUrl: mirror.htmlUrl,
    githubReleaseId: mirror.githubReleaseId,
    organizationId: mirror.organizationId,
    syncedFromGithub: true,
    title: githubReleaseTitle(mirror),
    updatedAt: now,
    version: mirror.tagName,
  });
  await ctx.db.patch(mirror._id, { refletReleaseId: releaseId });
  const release = await ctx.db.get(releaseId);
  if (!release) {
    throw new Error("Imported release vanished while saving");
  }
  return release;
}

export async function importMirroredRelease(
  ctx: MutationCtx,
  mirror: Doc<"githubReleases">,
  publication: ImportPublication | null
): Promise<Id<"releases">> {
  const existingRelease =
    (await findLinkedRelease(ctx, mirror)) ??
    (await findReleaseByVersion(ctx, mirror.organizationId, mirror.tagName));

  if (existingRelease) {
    await linkReleaseToMirror(ctx, existingRelease, mirror);
  }
  const release = existingRelease ?? (await insertImportedRelease(ctx, mirror));

  const releaseOwnedByGithub = release.syncedFromGithub === true;
  if (
    publication &&
    releaseOwnedByGithub &&
    release.publishedAt === undefined
  ) {
    await publishRelease(ctx, release, {
      ...publication,
      publishedAt: mirror.publishedAt ?? Date.now(),
    });
  }
  return release._id;
}

async function applyGithubProse(
  ctx: MutationCtx,
  release: Doc<"releases">,
  previous: Doc<"githubReleases">,
  mirror: Doc<"githubReleases">
): Promise<GithubProseOutcome> {
  const proseChanged =
    githubReleaseTitle(mirror) !== githubReleaseTitle(previous) ||
    githubReleaseDescription(mirror) !== githubReleaseDescription(previous);
  if (!proseChanged || releaseProseEquals(release, mirror)) {
    return { kind: "unchanged" };
  }
  if (releaseProseEquals(release, previous)) {
    return {
      kind: "applied",
      prose: { description: mirror.body, title: githubReleaseTitle(mirror) },
    };
  }
  await proposeGithubProse(ctx, release, mirror);
  return { kind: "proposed" };
}

function tagConflictError(
  release: Doc<"releases">,
  renamedTag: string
): Pick<
  Doc<"releases">,
  "githubPushError" | "githubPushErrorType" | "githubPushStatus"
> {
  return {
    githubPushError: `GitHub renamed tag ${release.version} to ${renamedTag}, which another release already uses. Push again to restore ${release.version} on GitHub.`,
    githubPushErrorType: "tag_conflict",
    githubPushStatus: "failed",
  };
}

export async function applyGithubEdit(
  ctx: MutationCtx,
  previous: Doc<"githubReleases">,
  mirror: Doc<"githubReleases">
): Promise<void> {
  if (!mirror.refletReleaseId) {
    return;
  }
  const release = await ctx.db.get(mirror.refletReleaseId);
  if (!release) {
    return;
  }

  const tagRenamed = mirror.tagName !== previous.tagName;
  const tagOwner = tagRenamed
    ? await findReleaseByVersion(ctx, release.organizationId, mirror.tagName)
    : null;
  const tagConflict = tagOwner !== null && tagOwner._id !== release._id;
  const adoptTag = tagRenamed && !tagConflict;
  const proseOutcome = await applyGithubProse(ctx, release, previous, mirror);
  const proseApplied = proseOutcome.kind === "applied";
  if (!(adoptTag || tagConflict || proseApplied)) {
    return;
  }

  const now = Date.now();
  const githubMatchesRelease =
    release.githubSyncedAt !== undefined &&
    !isGithubReleaseOutdated(release) &&
    !tagConflict &&
    proseOutcome.kind !== "proposed";
  await ctx.db.patch(release._id, {
    ...(proseApplied && proseOutcome.prose),
    ...(adoptTag && { version: mirror.tagName }),
    ...(tagConflict && tagConflictError(release, mirror.tagName)),
    ...(githubMatchesRelease && { githubSyncedAt: now }),
    updatedAt: now,
  });
}

export async function unlinkReleaseFromGithub(
  ctx: MutationCtx,
  releaseId: Id<"releases">
): Promise<void> {
  await ctx.db.patch(releaseId, {
    githubHtmlUrl: undefined,
    githubReleaseId: undefined,
    githubSyncedAt: undefined,
    syncedFromGithub: undefined,
  });
}

export async function removeMirror(
  ctx: MutationCtx,
  mirror: Doc<"githubReleases">
): Promise<void> {
  const release = await findLinkedRelease(ctx, mirror);
  if (release) {
    await unlinkReleaseFromGithub(ctx, release._id);
  }
  await ctx.db.delete(mirror._id);
}
