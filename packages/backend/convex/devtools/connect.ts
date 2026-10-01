import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalMutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { findActivePublicApiKey, hashSecretKey } from "../feedback/api_auth";
import { randomSecretHex } from "../shared/hmac";
import { getOrgMembership } from "../shared/membership";
import { BASE64URL_SHA256, CONNECT_CODE_TTL_MS } from "./constants";
import { isAllowedRedirectUri } from "./redirect_uri";

export const getConnectTarget = query({
  args: { publicKey: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return { kind: "signedOut" } as const;
    }
    const key = await findActivePublicApiKey(ctx, args.publicKey);
    if (!key) {
      return { kind: "unknownKey" } as const;
    }
    const membership = await getOrgMembership(
      ctx,
      key.organizationId,
      user._id
    );
    if (!membership) {
      return { kind: "notMember" } as const;
    }
    const organization = await ctx.db.get(key.organizationId);
    if (!organization) {
      return { kind: "unknownKey" } as const;
    }
    return { kind: "ready", organizationName: organization.name } as const;
  },
  returns: v.union(
    v.object({ kind: v.literal("signedOut") }),
    v.object({ kind: v.literal("unknownKey") }),
    v.object({ kind: v.literal("notMember") }),
    v.object({ kind: v.literal("ready"), organizationName: v.string() })
  ),
});

export const approve = action({
  args: {
    codeChallenge: v.string(),
    publicKey: v.string(),
    redirectUri: v.string(),
  },
  handler: async (ctx, args): Promise<{ code: string }> => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }
    if (!isAllowedRedirectUri(args.redirectUri)) {
      throw new Error("This link does not point to a local dev server.");
    }
    if (!BASE64URL_SHA256.test(args.codeChallenge)) {
      throw new Error(
        "This connect link is malformed. Start again from the devtools Board tab."
      );
    }

    const code = randomSecretHex(32);
    await ctx.runMutation(internal.devtools.connect.storeConnectCode, {
      codeChallenge: args.codeChallenge,
      codeHash: await hashSecretKey(code),
      publicKey: args.publicKey,
      redirectUri: args.redirectUri,
      userId: user._id,
    });
    return { code };
  },
  returns: v.object({ code: v.string() }),
});

export const storeConnectCode = internalMutation({
  args: {
    codeChallenge: v.string(),
    codeHash: v.string(),
    publicKey: v.string(),
    redirectUri: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const key = await findActivePublicApiKey(ctx, args.publicKey);
    if (!key) {
      throw new Error("This widget key isn't active on Reflet.");
    }
    const membership = await getOrgMembership(
      ctx,
      key.organizationId,
      args.userId
    );
    if (!membership) {
      throw new Error(
        "You're not a member of the organization that owns this widget."
      );
    }
    await ctx.db.insert("devtoolsConnectCodes", {
      codeChallenge: args.codeChallenge,
      codeHash: args.codeHash,
      expiresAt: Date.now() + CONNECT_CODE_TTL_MS,
      organizationId: key.organizationId,
      redirectUri: args.redirectUri,
      userId: args.userId,
    });
    return null;
  },
  returns: v.null(),
});

export const redeemConnectCode = internalMutation({
  args: {
    codeChallenge: v.string(),
    codeHash: v.string(),
    label: v.string(),
    redirectUri: v.string(),
    tokenHash: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ ok: true; organizationName: string } | { ok: false }> => {
    const connectCode = await ctx.db
      .query("devtoolsConnectCodes")
      .withIndex("by_code_hash", (q) => q.eq("codeHash", args.codeHash))
      .unique();
    if (!connectCode) {
      return { ok: false };
    }
    await ctx.db.delete(connectCode._id);

    const now = Date.now();
    const codeMatches =
      connectCode.expiresAt >= now &&
      connectCode.codeChallenge === args.codeChallenge &&
      connectCode.redirectUri === args.redirectUri;
    if (!codeMatches) {
      return { ok: false };
    }
    const membership = await getOrgMembership(
      ctx,
      connectCode.organizationId,
      connectCode.userId
    );
    const organization = await ctx.db.get(connectCode.organizationId);
    if (!(membership && organization)) {
      return { ok: false };
    }

    await ctx.db.insert("devtoolsTokens", {
      createdAt: now,
      label: args.label,
      lastUsedAt: now,
      organizationId: connectCode.organizationId,
      tokenHash: args.tokenHash,
      userId: connectCode.userId,
    });
    return { ok: true, organizationName: organization.name };
  },
  returns: v.union(
    v.object({ ok: v.literal(false) }),
    v.object({ ok: v.literal(true), organizationName: v.string() })
  ),
});
