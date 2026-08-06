import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { requireOrgAdmin } from "../shared/access";
import { supportConversationStatus } from "../shared/validators";
import { isOrgAdminViewer } from "./access";
import { resolveConversationPerson } from "./people";
import { supportConversationWithUser } from "./validators";

type ConversationStatus = Doc<"supportConversations">["status"];

const readByStatus = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  statuses: ConversationStatus[] | undefined
): Promise<Doc<"supportConversations">[]> => {
  if (!statuses || statuses.length === 0) {
    return await ctx.db
      .query("supportConversations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();
  }

  const perStatus = await Promise.all(
    [...new Set(statuses)].map((status) =>
      ctx.db
        .query("supportConversations")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", organizationId).eq("status", status)
        )
        .collect()
    )
  );

  return perStatus.flat();
};

export const list = query({
  args: {
    assignedTo: v.optional(v.string()),
    organizationId: v.id("organizations"),
    status: v.optional(v.array(supportConversationStatus)),
  },
  handler: async (ctx, args) => {
    if (!(await isOrgAdminViewer(ctx, args.organizationId))) {
      return [];
    }

    const conversations = await readByStatus(
      ctx,
      args.organizationId,
      args.status
    );

    const visible = args.assignedTo
      ? conversations.filter((c) => c.assignedTo === args.assignedTo)
      : conversations;

    visible.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    return await Promise.all(
      visible.map(async (conversation) => ({
        ...conversation,
        user: await resolveConversationPerson(ctx, conversation),
      }))
    );
  },
  returns: v.array(supportConversationWithUser),
});

export const updateStatus = mutation({
  args: {
    id: v.id("supportConversations"),
    status: supportConversationStatus,
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.id);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    await requireOrgAdmin(
      ctx,
      conversation.organizationId,
      "update conversation status"
    );

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return args.id;
  },
  returns: v.id("supportConversations"),
});

export const assign = mutation({
  args: {
    assignedTo: v.optional(v.string()),
    id: v.id("supportConversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.id);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    await requireOrgAdmin(
      ctx,
      conversation.organizationId,
      "assign conversations"
    );

    const { assignedTo } = args;
    if (assignedTo) {
      const assigneeMembership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q
            .eq("organizationId", conversation.organizationId)
            .eq("userId", assignedTo)
        )
        .unique();

      if (!assigneeMembership) {
        throw new Error("Assignee is not a member of this organization");
      }
    }

    await ctx.db.patch(args.id, {
      assignedTo,
      updatedAt: Date.now(),
    });

    return args.id;
  },
  returns: v.id("supportConversations"),
});

export const getUnreadCount = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    if (!(await isOrgAdminViewer(ctx, args.organizationId))) {
      return 0;
    }

    const conversations = await ctx.db
      .query("supportConversations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return conversations.reduce((acc, conv) => acc + conv.adminUnreadCount, 0);
  },
  returns: v.number(),
});
