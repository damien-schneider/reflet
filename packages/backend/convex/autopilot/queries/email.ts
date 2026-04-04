/**
 * Email queries — list, get individual, and thread.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { emailDirection, emailStatus } from "../schema/validators";
import { requireOrgMembership } from "./auth";

export const listEmails = query({
  args: {
    organizationId: v.id("organizations"),
    direction: v.optional(emailDirection),
    limit: v.optional(v.number()),
    status: v.optional(emailStatus),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? 50;

    if (args.direction) {
      const { direction } = args;
      const emails = await ctx.db
        .query("autopilotEmails")
        .withIndex("by_org_direction", (q) =>
          q.eq("organizationId", args.organizationId).eq("direction", direction)
        )
        .order("desc")
        .take(limit);

      if (args.status) {
        return emails.filter((e) => e.status === args.status);
      }
      return emails;
    }

    return ctx.db
      .query("autopilotEmails")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);
  },
});

export const getEmailThread = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const emails = await ctx.db
      .query("autopilotEmails")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();

    if (emails.length === 0) {
      return [];
    }

    await requireOrgMembership(ctx, emails[0].organizationId, user._id);
    return emails;
  },
});

export const getEmail = query({
  args: { emailId: v.id("autopilotEmails") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const email = await ctx.db.get(args.emailId);

    if (!email) {
      return null;
    }

    await requireOrgMembership(ctx, email.organizationId, user._id);
    return email;
  },
});
