/**
 * Knowledge doc mutations — public, auth-gated.
 */

import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import { action, mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireAutopilotAccess, requireOrgAdmin } from "./auth";

const USER_EDIT_PROTECTION_MS = 72 * 60 * 60 * 1000;

export const updateKnowledgeDoc = mutation({
  args: {
    docId: v.id("autopilotKnowledgeDocs"),
    contentFull: v.string(),
    contentSummary: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.docId);
    if (!doc) {
      throw new Error("Knowledge doc not found");
    }

    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, doc.organizationId, user._id);
    await requireAutopilotAccess(ctx, doc.organizationId);

    const now = Date.now();

    await ctx.db.patch(args.docId, {
      contentFull: args.contentFull,
      contentSummary: args.contentSummary,
      userEdited: true,
      userEditedAt: now,
      userEditProtectedUntil: now + USER_EDIT_PROTECTION_MS,
      version: doc.version + 1,
      lastUpdatedAt: now,
    });

    await ctx.db.insert("autopilotKnowledgeDocVersions", {
      docId: args.docId,
      version: doc.version + 1,
      content: args.contentFull,
      editedBy: "user",
      createdAt: now,
    });
  },
});

/**
 * Delete the typed product profile + its version history, with admin auth check.
 */
export const deleteProductProfileAndRegenerate = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);
    await requireAutopilotAccess(ctx, args.organizationId);

    const profile = await ctx.db
      .query("autopilotProductProfile")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (profile) {
      const versions = await ctx.db
        .query("autopilotProductProfileVersions")
        .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
        .collect();

      for (const version of versions) {
        await ctx.db.delete(version._id);
      }

      await ctx.db.delete(profile._id);
    }

    return null;
  },
});

/**
 * Regenerate the product profile by re-running deep product exploration. The
 * chain heartbeat then dispatches `produceProductProfile` once
 * `codebase_understanding` is published again.
 */
export const regenerateProductDefinition = action({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(
      api.autopilot.mutations.knowledge.deleteProductProfileAndRegenerate,
      { organizationId: args.organizationId }
    );

    await ctx.runMutation(
      internal.integrations.github.repo_analysis.startAnalysisInternal,
      { organizationId: args.organizationId }
    );

    return null;
  },
});
