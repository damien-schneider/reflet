import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalMutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { BASE64URL_SHA256 } from "../devtools/constants";
import { findActivePublicApiKey, hashSecretKey } from "../feedback/api_auth";
import { requireAuthUser } from "../shared/access";
import { randomSecretHex } from "../shared/hmac";
import { getOrgMembership } from "../shared/membership";
import { TEAM_ACCESS_CODE_TTL_MS, TEAM_TOKEN_TTL_MS } from "./constants";
import {
  TEAM_ORIGIN_PROBLEM_MESSAGES,
  teamOriginProblem,
  teamOriginProblemValidator,
} from "./origin";

export const getTarget = query({
  args: { origin: v.string(), publicKey: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    const key = user ? await findActivePublicApiKey(ctx, args.publicKey) : null;
    const organization = key ? await ctx.db.get(key.organizationId) : null;
    if (!(user && key && organization)) {
      return null;
    }
    const membership = await getOrgMembership(ctx, organization._id, user._id);
    return {
      isMember: membership !== null,
      organizationName: organization.name,
      origin: args.origin,
      originProblem: teamOriginProblem(args.origin, key.allowedDomains),
    };
  },
  returns: v.union(
    v.null(),
    v.object({
      isMember: v.boolean(),
      organizationName: v.string(),
      origin: v.string(),
      originProblem: v.union(v.null(), teamOriginProblemValidator),
    })
  ),
});

export const approve = action({
  args: {
    codeChallenge: v.string(),
    origin: v.string(),
    publicKey: v.string(),
  },
  handler: async (ctx, args): Promise<{ code: string }> => {
    const user = await requireAuthUser(ctx);
    if (!BASE64URL_SHA256.test(args.codeChallenge)) {
      throw new Error(TEAM_ORIGIN_PROBLEM_MESSAGES.invalid);
    }
    const code = randomSecretHex(32);
    await ctx.runMutation(internal.team_access.connect.storeCode, {
      codeChallenge: args.codeChallenge,
      codeHash: await hashSecretKey(code),
      origin: args.origin,
      publicKey: args.publicKey,
      userId: user._id,
    });
    return { code };
  },
  returns: v.object({ code: v.string() }),
});

export const storeCode = internalMutation({
  args: {
    codeChallenge: v.string(),
    codeHash: v.string(),
    origin: v.string(),
    publicKey: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const key = await findActivePublicApiKey(ctx, args.publicKey);
    if (!key) {
      throw new Error("This widget key isn't active on Reflet.");
    }
    const originProblem = teamOriginProblem(args.origin, key.allowedDomains);
    if (originProblem) {
      throw new Error(TEAM_ORIGIN_PROBLEM_MESSAGES[originProblem]);
    }
    const membership = await getOrgMembership(
      ctx,
      key.organizationId,
      args.userId
    );
    if (!membership) {
      throw new Error(
        "You're not a member of the organization that owns this app."
      );
    }
    await ctx.db.insert("teamAccessCodes", {
      apiKeyId: key._id,
      codeChallenge: args.codeChallenge,
      codeHash: args.codeHash,
      expiresAt: Date.now() + TEAM_ACCESS_CODE_TTL_MS,
      organizationId: key.organizationId,
      origin: args.origin,
      userId: args.userId,
    });
    return null;
  },
  returns: v.null(),
});

export const redeemCode = internalMutation({
  args: {
    codeChallenge: v.string(),
    codeHash: v.string(),
    origin: v.string(),
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const accessCode = await ctx.db
      .query("teamAccessCodes")
      .withIndex("by_code_hash", (q) => q.eq("codeHash", args.codeHash))
      .unique();
    if (!accessCode) {
      return { ok: false } as const;
    }
    await ctx.db.delete(accessCode._id);

    const now = Date.now();
    const codeMatches =
      accessCode.expiresAt >= now &&
      accessCode.codeChallenge === args.codeChallenge &&
      accessCode.origin === args.origin;
    const membership = await getOrgMembership(
      ctx,
      accessCode.organizationId,
      accessCode.userId
    );
    const organization = await ctx.db.get(accessCode.organizationId);
    if (!(codeMatches && membership && organization)) {
      return { ok: false } as const;
    }

    const expiresAt = now + TEAM_TOKEN_TTL_MS;
    await ctx.db.insert("teamAccessTokens", {
      apiKeyId: accessCode.apiKeyId,
      createdAt: now,
      expiresAt,
      lastUsedAt: now,
      organizationId: accessCode.organizationId,
      origin: accessCode.origin,
      tokenHash: args.tokenHash,
      userId: accessCode.userId,
    });
    return {
      expiresAt,
      ok: true,
      organizationName: organization.name,
    } as const;
  },
  returns: v.union(
    v.object({ ok: v.literal(false) }),
    v.object({
      expiresAt: v.number(),
      ok: v.literal(true),
      organizationName: v.string(),
    })
  ),
});
