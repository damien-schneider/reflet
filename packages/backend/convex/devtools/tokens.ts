import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { authComponent } from "../auth/auth";
import { requireAuthUser } from "../shared/access";
import { getOrgMembership } from "../shared/membership";
import {
  DEVTOOLS_TOKEN_IDLE_EXPIRY_MS,
  DEVTOOLS_TOKEN_TOUCH_INTERVAL_MS,
} from "./constants";

const CLEANUP_BATCH_SIZE = 500;

export const validateDevtoolsToken = internalQuery({
  args: { tokenHash: v.string() },
  handler: async (
    ctx,
    args
  ): Promise<{
    devtoolsTokenId: Id<"devtoolsTokens">;
    organizationId: Id<"organizations">;
    userId: string;
  } | null> => {
    const token = await ctx.db
      .query("devtoolsTokens")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();
    if (
      !token ||
      token.lastUsedAt + DEVTOOLS_TOKEN_IDLE_EXPIRY_MS < Date.now()
    ) {
      return null;
    }
    const organization = await ctx.db.get(token.organizationId);
    const membership = await getOrgMembership(
      ctx,
      token.organizationId,
      token.userId
    );
    if (!(organization && membership)) {
      return null;
    }
    return {
      devtoolsTokenId: token._id,
      organizationId: token.organizationId,
      userId: token.userId,
    };
  },
  returns: v.union(
    v.null(),
    v.object({
      devtoolsTokenId: v.id("devtoolsTokens"),
      organizationId: v.id("organizations"),
      userId: v.string(),
    })
  ),
});

export const touchDevtoolsToken = internalMutation({
  args: { devtoolsTokenId: v.id("devtoolsTokens") },
  handler: async (ctx, args) => {
    const token = await ctx.db.get(args.devtoolsTokenId);
    const now = Date.now();
    if (token && now - token.lastUsedAt > DEVTOOLS_TOKEN_TOUCH_INTERVAL_MS) {
      await ctx.db.patch(token._id, { lastUsedAt: now });
    }
    return null;
  },
  returns: v.null(),
});

export const revokeByHash = internalMutation({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("devtoolsTokens")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();
    if (token) {
      await ctx.db.delete(token._id);
    }
    return null;
  },
  returns: v.null(),
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }
    const tokens = await ctx.db
      .query("devtoolsTokens")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const connections: {
      _id: Id<"devtoolsTokens">;
      createdAt: number;
      label: string;
      lastUsedAt: number;
      organizationName: string;
    }[] = [];
    for (const token of tokens) {
      const organization = await ctx.db.get(token.organizationId);
      if (organization) {
        connections.push({
          _id: token._id,
          createdAt: token.createdAt,
          label: token.label,
          lastUsedAt: token.lastUsedAt,
          organizationName: organization.name,
        });
      }
    }
    return connections.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  },
  returns: v.array(
    v.object({
      _id: v.id("devtoolsTokens"),
      createdAt: v.number(),
      label: v.string(),
      lastUsedAt: v.number(),
      organizationName: v.string(),
    })
  ),
});

export const revoke = mutation({
  args: { tokenId: v.id("devtoolsTokens") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const token = await ctx.db.get(args.tokenId);
    if (!token || token.userId !== user._id) {
      throw new Error("Connection not found");
    }
    await ctx.db.delete(token._id);
    return null;
  },
  returns: v.null(),
});

export const cleanupExpiredDevtoolsCredentials = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredCodes = await ctx.db
      .query("devtoolsConnectCodes")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .take(CLEANUP_BATCH_SIZE);
    const idleTokens = await ctx.db
      .query("devtoolsTokens")
      .withIndex("by_last_used_at", (q) =>
        q.lt("lastUsedAt", now - DEVTOOLS_TOKEN_IDLE_EXPIRY_MS)
      )
      .take(CLEANUP_BATCH_SIZE);
    for (const row of [...expiredCodes, ...idleTokens]) {
      await ctx.db.delete(row._id);
    }
    return null;
  },
  returns: v.null(),
});
