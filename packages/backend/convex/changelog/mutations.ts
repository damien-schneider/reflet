import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireOrgAdmin } from "../shared/access";
import {
  MAX_CHANGELOG_VERSION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from "../shared/constants";
import { validateInputLength } from "../shared/validators";
import { assertVersionAvailable } from "./release_lifecycle";

export const create = mutation({
  args: {
    description: v.optional(v.string()),
    organizationId: v.id("organizations"),
    title: v.string(),
    version: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateInputLength(args.title, MAX_TITLE_LENGTH, "Title");
    validateInputLength(
      args.description,
      MAX_DESCRIPTION_LENGTH,
      "Description"
    );
    validateInputLength(args.version, MAX_CHANGELOG_VERSION_LENGTH, "Version");

    await requireOrgAdmin(ctx, args.organizationId, "create releases");
    await assertVersionAvailable(ctx, args.organizationId, args.version);

    const now = Date.now();
    return await ctx.db.insert("releases", {
      createdAt: now,
      description: args.description,
      organizationId: args.organizationId,
      title: args.title,
      updatedAt: now,
      version: args.version,
    });
  },
});

export const update = mutation({
  args: {
    description: v.optional(v.string()),
    id: v.id("releases"),
    title: v.optional(v.string()),
    version: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateInputLength(args.title, MAX_TITLE_LENGTH, "Title");
    validateInputLength(
      args.description,
      MAX_DESCRIPTION_LENGTH,
      "Description"
    );
    validateInputLength(args.version, MAX_CHANGELOG_VERSION_LENGTH, "Version");

    const release = await ctx.db.get(args.id);
    if (!release) {
      throw new Error("Release not found");
    }
    await requireOrgAdmin(ctx, release.organizationId, "update releases");
    await assertVersionAvailable(
      ctx,
      release.organizationId,
      args.version,
      release._id
    );

    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });

    return id;
  },
});
