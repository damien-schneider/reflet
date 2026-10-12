import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { authComponent } from "../auth/auth";
import { requireAuthUser } from "../shared/access";
import { getOrgMembership } from "../shared/membership";
import { TEAM_TOKEN_TOUCH_INTERVAL_MS } from "./constants";
import { teamOriginProblem } from "./origin";

const CLEANUP_BATCH_SIZE = 500;

const teamTokenActorValidator = v.object({
  organizationId: v.id("organizations"),
  teamTokenId: v.id("teamAccessTokens"),
  userId: v.string(),
});

const teamAccessListingValidator = v.object({
  _id: v.id("teamAccessTokens"),
  createdAt: v.number(),
  expiresAt: v.number(),
  lastUsedAt: v.number(),
  organizationName: v.string(),
  origin: v.string(),
});

export const validateTeamToken = internalQuery({
  args: { origin: v.string(), tokenHash: v.string() },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("teamAccessTokens")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();
    if (
      !token ||
      token.expiresAt <= Date.now() ||
      token.origin !== args.origin
    ) {
      return null;
    }
    const apiKey = await ctx.db.get(token.apiKeyId);
    const keyStillAllowsOrigin =
      apiKey?.isActive === true &&
      apiKey.organizationId === token.organizationId &&
      teamOriginProblem(token.origin, apiKey.allowedDomains) === null;
    const organization = await ctx.db.get(token.organizationId);
    const membership = await getOrgMembership(
      ctx,
      token.organizationId,
      token.userId
    );
    if (!(keyStillAllowsOrigin && organization && membership)) {
      return null;
    }
    return {
      organizationId: token.organizationId,
      teamTokenId: token._id,
      userId: token.userId,
    };
  },
  returns: v.union(v.null(), teamTokenActorValidator),
});

export const touchTeamToken = internalMutation({
  args: { teamTokenId: v.id("teamAccessTokens") },
  handler: async (ctx, args) => {
    const token = await ctx.db.get(args.teamTokenId);
    const now = Date.now();
    if (token && now - token.lastUsedAt > TEAM_TOKEN_TOUCH_INTERVAL_MS) {
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
      .query("teamAccessTokens")
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
    const now = Date.now();
    const tokens = await ctx.db
      .query("teamAccessTokens")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const listings: (typeof teamAccessListingValidator.type)[] = [];
    for (const token of tokens) {
      const organization = await ctx.db.get(token.organizationId);
      if (organization && token.expiresAt > now) {
        listings.push({
          _id: token._id,
          createdAt: token.createdAt,
          expiresAt: token.expiresAt,
          lastUsedAt: token.lastUsedAt,
          organizationName: organization.name,
          origin: token.origin,
        });
      }
    }
    return listings.sort((a, b) => b.createdAt - a.createdAt);
  },
  returns: v.array(teamAccessListingValidator),
});

export const revoke = mutation({
  args: { tokenId: v.id("teamAccessTokens") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const token = await ctx.db.get(args.tokenId);
    if (!token || token.userId !== user._id) {
      throw new Error("Team access not found");
    }
    await ctx.db.delete(token._id);
    return null;
  },
  returns: v.null(),
});

export const cleanupExpiredTeamCredentials = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredCodes = await ctx.db
      .query("teamAccessCodes")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .take(CLEANUP_BATCH_SIZE);
    const expiredTokens = await ctx.db
      .query("teamAccessTokens")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .take(CLEANUP_BATCH_SIZE);
    for (const row of [...expiredCodes, ...expiredTokens]) {
      await ctx.db.delete(row._id);
    }
    return null;
  },
  returns: v.null(),
});
