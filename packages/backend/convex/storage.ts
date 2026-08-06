import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUser } from "./shared/access";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuthUser(ctx);

    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Storage ids are unguessable but not scoped to an organization, so the signed
 * URL is only handed to signed-in callers — never to the open internet.
 */
export const getStorageUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireAuthUser(ctx);

    return await ctx.storage.getUrl(args.storageId);
  },
});

/** Mutation twin of `getStorageUrl`, for reading the URL right after an upload. */
export const getStorageUrlMutation = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireAuthUser(ctx);

    return await ctx.storage.getUrl(args.storageId);
  },
});
