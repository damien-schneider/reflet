import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation, mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { requireOrgAdmin } from "../shared/access";
import { getOrgMembership, isOrgAdmin } from "../shared/membership";
import { UNTITLED_RELEASE_TITLE } from "./release_text";
import type { ReleaseSource } from "./source";
import { releaseSourceValidator } from "./tableFields";

const DRAFT_ACTION = "manage release drafts";

async function requireReleaseAdmin(
  ctx: MutationCtx,
  releaseId: Id<"releases">
): Promise<Doc<"releases">> {
  const release = await ctx.db.get(releaseId);
  if (!release) {
    throw new Error("Release not found");
  }
  await requireOrgAdmin(ctx, release.organizationId, DRAFT_ACTION);
  return release;
}

async function requirePendingDraft(
  ctx: MutationCtx,
  draftId: Id<"releaseDrafts">
): Promise<Doc<"releaseDrafts">> {
  const draft = await ctx.db.get(draftId);
  if (!draft) {
    throw new Error("Draft not found");
  }
  await requireOrgAdmin(ctx, draft.organizationId, DRAFT_ACTION);
  if (draft.status !== "pending") {
    throw new Error("Draft was already resolved");
  }
  return draft;
}

async function dismissPendingDrafts(
  ctx: MutationCtx,
  releaseId: Id<"releases">,
  keep: (draft: Doc<"releaseDrafts">) => boolean
): Promise<void> {
  const pending = await ctx.db
    .query("releaseDrafts")
    .withIndex("by_release_status", (q) =>
      q.eq("releaseId", releaseId).eq("status", "pending")
    )
    .collect();
  const now = Date.now();
  for (const draft of pending) {
    if (!keep(draft)) {
      await ctx.db.patch(draft._id, { resolvedAt: now, status: "dismissed" });
    }
  }
}

async function replaceReleaseSnapshot(
  ctx: MutationCtx,
  releaseId: Id<"releases">,
  source: ReleaseSource
): Promise<void> {
  const previousSnapshots = await ctx.db
    .query("releaseCommits")
    .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
    .collect();
  for (const snapshot of previousSnapshots) {
    await ctx.db.delete(snapshot._id);
  }
  await ctx.db.insert("releaseCommits", {
    baseRef: source.baseRef,
    commits: source.commits,
    createdAt: Date.now(),
    files: source.files,
    headRef: source.headRef,
    headSha: source.headSha,
    pullRequests: source.pullRequests,
    releaseId,
    totalCommits: source.totalCommits,
  });
}

async function applyDraftToRelease(
  ctx: MutationCtx,
  draft: Doc<"releaseDrafts">,
  { keepCurrentTitle }: { keepCurrentTitle: boolean }
): Promise<void> {
  const now = Date.now();
  const appliesTitle = Boolean(draft.title) && !keepCurrentTitle;
  await ctx.db.patch(draft.releaseId, {
    description: draft.description,
    ...(appliesTitle ? { title: draft.title } : {}),
    updatedAt: now,
  });
  if (draft.source) {
    await replaceReleaseSnapshot(ctx, draft.releaseId, draft.source);
  }
  await ctx.db.patch(draft._id, { resolvedAt: now, status: "applied" });
  await dismissPendingDrafts(
    ctx,
    draft.releaseId,
    (other) => other._id === draft._id
  );
}

export const saveGeneratedDraft = mutation({
  args: {
    description: v.string(),
    releaseId: v.id("releases"),
    source: releaseSourceValidator,
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const release = await requireReleaseAdmin(ctx, args.releaseId);

    const latestApplied = await ctx.db
      .query("releaseDrafts")
      .withIndex("by_release_status", (q) =>
        q.eq("releaseId", release._id).eq("status", "applied")
      )
      .order("desc")
      .first();
    const descriptionEdited =
      Boolean(release.description) &&
      release.description !== latestApplied?.description;
    const titleEdited =
      release.title !== UNTITLED_RELEASE_TITLE &&
      release.title !== latestApplied?.title;

    const draftId = await ctx.db.insert("releaseDrafts", {
      createdAt: Date.now(),
      description: args.description,
      organizationId: release.organizationId,
      origin: "ai",
      releaseId: release._id,
      source: args.source,
      status: "pending",
      title: args.title,
    });
    if (descriptionEdited) {
      await dismissPendingDrafts(
        ctx,
        release._id,
        (draft) => draft._id === draftId || draft.origin !== "ai"
      );
      return { applied: false, draftId };
    }

    const draft = await ctx.db.get(draftId);
    if (draft) {
      await applyDraftToRelease(ctx, draft, { keepCurrentTitle: titleEdited });
    }
    return { applied: true, draftId };
  },
  returns: v.object({ applied: v.boolean(), draftId: v.id("releaseDrafts") }),
});

export const getPendingDraft = query({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    const release = await ctx.db.get(args.releaseId);
    if (!(user && release)) {
      return null;
    }
    const membership = await getOrgMembership(
      ctx,
      release.organizationId,
      user._id
    );
    if (!isOrgAdmin(membership?.role)) {
      return null;
    }
    return await ctx.db
      .query("releaseDrafts")
      .withIndex("by_release_status", (q) =>
        q.eq("releaseId", args.releaseId).eq("status", "pending")
      )
      .order("desc")
      .first();
  },
});

export const applyDraft = mutation({
  args: { draftId: v.id("releaseDrafts") },
  handler: async (ctx, args) => {
    await applyDraftToRelease(
      ctx,
      await requirePendingDraft(ctx, args.draftId),
      { keepCurrentTitle: false }
    );
    return null;
  },
  returns: v.null(),
});

export const dismissDraft = mutation({
  args: { draftId: v.id("releaseDrafts") },
  handler: async (ctx, args) => {
    const draft = await requirePendingDraft(ctx, args.draftId);
    await ctx.db.patch(draft._id, {
      resolvedAt: Date.now(),
      status: "dismissed",
    });
    return null;
  },
  returns: v.null(),
});

export const recordGithubDraft = internalMutation({
  args: {
    description: v.string(),
    releaseId: v.id("releases"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release) {
      return null;
    }
    await dismissPendingDrafts(
      ctx,
      release._id,
      (draft) => draft.origin !== "github"
    );
    await ctx.db.insert("releaseDrafts", {
      createdAt: Date.now(),
      description: args.description,
      organizationId: release.organizationId,
      origin: "github",
      releaseId: release._id,
      status: "pending",
      title: args.title,
    });
    return null;
  },
  returns: v.null(),
});
