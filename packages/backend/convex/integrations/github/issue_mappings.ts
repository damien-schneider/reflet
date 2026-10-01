import { v } from "convex/values";
import { internalMutation, mutation } from "../../_generated/server";
import { statusFieldsFor } from "../../feedback/status_target";
import { requireOrgAdmin } from "../../shared/access";
import { SYSTEM_ACTOR_ID } from "../../shared/actors";

export const upsertLabelMapping = mutation({
  args: {
    autoSync: v.boolean(),
    defaultStatus: v.optional(
      v.union(
        v.literal("open"),
        v.literal("under_review"),
        v.literal("planned"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("closed")
      )
    ),
    githubLabelColor: v.optional(v.string()),
    githubLabelName: v.string(),
    organizationId: v.id("organizations"),
    syncClosedIssues: v.optional(v.boolean()),
    targetTagId: v.optional(v.id("tags")),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, "configure label mappings");

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection) {
      throw new Error("No GitHub connection found");
    }

    const now = Date.now();

    const existing = await ctx.db
      .query("githubLabelMappings")
      .withIndex("by_connection_label", (q) =>
        q
          .eq("githubConnectionId", connection._id)
          .eq("githubLabelName", args.githubLabelName)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        autoSync: args.autoSync,
        defaultStatus: args.defaultStatus,
        githubLabelColor: args.githubLabelColor,
        syncClosedIssues: args.syncClosedIssues,
        targetTagId: args.targetTagId,
        updatedAt: now,
      });
      return existing._id;
    }

    const mappingId = await ctx.db.insert("githubLabelMappings", {
      autoSync: args.autoSync,
      createdAt: now,
      defaultStatus: args.defaultStatus,
      githubConnectionId: connection._id,
      githubLabelColor: args.githubLabelColor,
      githubLabelName: args.githubLabelName,
      organizationId: args.organizationId,
      syncClosedIssues: args.syncClosedIssues,
      targetTagId: args.targetTagId,
      updatedAt: now,
    });

    return mappingId;
  },
});

export const deleteLabelMapping = mutation({
  args: {
    mappingId: v.id("githubLabelMappings"),
  },
  handler: async (ctx, args) => {
    const mapping = await ctx.db.get(args.mappingId);
    if (!mapping) {
      throw new Error("Mapping not found");
    }

    await requireOrgAdmin(ctx, mapping.organizationId, "delete label mappings");

    await ctx.db.delete(args.mappingId);
    return true;
  },
});

export const autoImportIssuesByLabel = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection) {
      throw new Error("No GitHub connection found");
    }

    const mappings = await ctx.db
      .query("githubLabelMappings")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connection._id)
      )
      .collect();

    const activeMappings = mappings.filter((m) => m.autoSync);

    if (activeMappings.length === 0) {
      return { imported: 0 };
    }

    const issues = await ctx.db
      .query("githubIssues")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connection._id)
      )
      .collect();

    const unimportedIssues = issues.filter((i) => !i.refletFeedbackId);

    let importedCount = 0;
    const now = Date.now();

    for (const issue of unimportedIssues) {
      const matchingMapping = activeMappings.find((mapping) => {
        const hasLabel = issue.githubLabels.some(
          (label) =>
            label.toLowerCase() === mapping.githubLabelName.toLowerCase()
        );

        if (!hasLabel) {
          return false;
        }

        if (issue.state === "closed" && !mapping.syncClosedIssues) {
          return false;
        }

        return true;
      });

      if (matchingMapping) {
        let feedbackStatus = matchingMapping.defaultStatus ?? "open";
        if (issue.state === "closed" && !matchingMapping.defaultStatus) {
          feedbackStatus = "closed";
        }

        const feedbackId = await ctx.db.insert("feedback", {
          authorId: SYSTEM_ACTOR_ID,
          commentCount: 0,
          createdAt: now,
          description: issue.body ?? "",
          githubHtmlUrl: issue.htmlUrl,
          githubIssueId: issue.githubIssueId,
          githubIssueNumber: issue.githubIssueNumber,
          isApproved: true,
          isPinned: false,
          organizationId: args.organizationId,
          ...(await statusFieldsFor(ctx, {
            organizationId: args.organizationId,
            status: feedbackStatus,
          })),
          syncedFromGithub: true,
          title: issue.title,
          updatedAt: now,
          voteCount: 0,
        });

        if (matchingMapping.targetTagId) {
          await ctx.db.insert("feedbackTags", {
            feedbackId,
            tagId: matchingMapping.targetTagId,
          });
        }

        await ctx.db.patch(issue._id, {
          refletFeedbackId: feedbackId,
        });

        importedCount++;
      }
    }

    return { imported: importedCount };
  },
});
