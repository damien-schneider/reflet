/**
 * Knowledge doc mutations — public, auth-gated.
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgAdmin } from "./auth";

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
