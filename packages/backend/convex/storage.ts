import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAuthUser } from "./shared/access";
import { rateLimiter } from "./shared/rate_limits";

const RESOLVE_WINDOW_MS = 30 * 60 * 1000;

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    await rateLimiter.limit(ctx, "storageUploadPerUser", {
      key: user._id,
      throws: true,
    });
    return await ctx.storage.generateUploadUrl();
  },
  returns: v.string(),
});

/**
 * Storage ids are unguessable but not scoped to an organization, so a signed
 * URL is only handed back for an upload the caller just made.
 */
export const getStorageUrl = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireAuthUser(ctx);
    const file = await ctx.db.system.get(args.storageId);
    if (!file || Date.now() - file._creationTime > RESOLVE_WINDOW_MS) {
      throw new Error("Upload not found");
    }
    return await ctx.storage.getUrl(args.storageId);
  },
  returns: v.union(v.string(), v.null()),
});
