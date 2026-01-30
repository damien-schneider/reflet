import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUser } from "./utils";

/**
 * Generate a URL for uploading a file to Convex storage.
 * Requires authentication.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Ensure user is authenticated
    await getAuthUser(ctx);

    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get a URL for accessing a stored file.
 * Public query - no authentication required.
 */
export const getStorageUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Get a URL for accessing a stored file (mutation version).
 * Can be called imperatively after upload to get the URL immediately.
 */
export const getStorageUrlMutation = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
