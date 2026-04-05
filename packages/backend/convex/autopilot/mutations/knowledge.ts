/**
 * Knowledge doc mutations — public, auth-gated.
 */

import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import { action, mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgAdmin } from "./auth";

const USER_EDIT_PROTECTION_MS = 72 * 60 * 60 * 1000;

export const upsertProductDefinition = mutation({
  args: {
    organizationId: v.id("organizations"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);

    const now = Date.now();
    const summary = args.content.slice(0, 200).trimEnd();

    const existing = await ctx.db
      .query("autopilotKnowledgeDocs")
      .withIndex("by_org_docType", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("docType", "product_definition")
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        contentFull: args.content,
        contentSummary: summary,
        userEdited: true,
        userEditedAt: now,
        userEditProtectedUntil: now + USER_EDIT_PROTECTION_MS,
        version: existing.version + 1,
        lastUpdatedAt: now,
      });

      await ctx.db.insert("autopilotKnowledgeDocVersions", {
        docId: existing._id,
        version: existing.version + 1,
        content: args.content,
        editedBy: "user",
        createdAt: now,
      });
    } else {
      const docId = await ctx.db.insert("autopilotKnowledgeDocs", {
        organizationId: args.organizationId,
        docType: "product_definition",
        ownerAgent: "pm",
        title: "Product Definition",
        contentFull: args.content,
        contentSummary: summary,
        version: 1,
        userEdited: true,
        userEditedAt: now,
        userEditProtectedUntil: now + USER_EDIT_PROTECTION_MS,
        stalenessAlertDays: 30,
        lastUpdatedAt: now,
        createdAt: now,
      });

      await ctx.db.insert("autopilotKnowledgeDocVersions", {
        docId,
        version: 1,
        content: args.content,
        editedBy: "user",
        createdAt: now,
      });
    }

    return null;
  },
});

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
 * Delete the product_definition doc and its versions, with admin auth check.
 * Returns true if a doc was deleted, false if none existed.
 */
export const deleteProductDefinitionAndRegenerate = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);

    const doc = await ctx.db
      .query("autopilotKnowledgeDocs")
      .withIndex("by_org_docType", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("docType", "product_definition")
      )
      .unique();

    if (doc) {
      const versions = await ctx.db
        .query("autopilotKnowledgeDocVersions")
        .withIndex("by_doc", (q) => q.eq("docId", doc._id))
        .collect();

      for (const version of versions) {
        await ctx.db.delete(version._id);
      }

      await ctx.db.delete(doc._id);
    }

    return null;
  },
});

/**
 * Regenerate the product definition by re-running deep product exploration.
 * Deletes the existing doc, triggers a new analysis → exploration → brief pipeline.
 */
export const regenerateProductDefinition = action({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Auth-gated mutation: deletes existing doc
    await ctx.runMutation(
      api.autopilot.mutations.knowledge.deleteProductDefinitionAndRegenerate,
      { organizationId: args.organizationId }
    );

    // Trigger a new repo analysis which will run the product exploration
    await ctx.runMutation(
      internal.integrations.github.repo_analysis.startAnalysisInternal,
      { organizationId: args.organizationId }
    );

    return null;
  },
});
