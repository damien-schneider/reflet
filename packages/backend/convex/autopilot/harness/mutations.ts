import {
  DEFAULT_HARNESS_RECIPES,
  evaluateHarnessGuards,
} from "@reflet/harness";
import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  mutation,
} from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireAutopilotAccess, requireOrgAdmin } from "../mutations/auth";
import { readHarnessGuardState } from "./guards";

async function getLatestBridge(
  ctx: { db: MutationCtx["db"] },
  organizationId: Id<"organizations">,
  repoFullName: string
): Promise<Doc<"autopilotBridgeInstallations"> | null> {
  return await ctx.db
    .query("autopilotBridgeInstallations")
    .withIndex("by_org_repo", (q) =>
      q.eq("organizationId", organizationId).eq("repoFullName", repoFullName)
    )
    .order("desc")
    .first();
}

async function enqueueHarnessJobForRecipe(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    recipeId: string;
    repoFullName: string;
  }
): Promise<Id<"autopilotBridgeJobs">> {
  const recipe = DEFAULT_HARNESS_RECIPES.find(
    (candidate) => candidate.id === args.recipeId
  );
  if (!recipe) {
    throw new Error(`Unknown harness recipe: ${args.recipeId}`);
  }

  const user = await getAuthUser(ctx);
  await requireOrgAdmin(ctx, args.organizationId, user._id);
  await requireAutopilotAccess(ctx, args.organizationId);

  const bridge = await getLatestBridge(
    ctx,
    args.organizationId,
    args.repoFullName
  );
  const guard = evaluateHarnessGuards(
    await readHarnessGuardState(ctx, {
      organizationId: args.organizationId,
      repoFullName: args.repoFullName,
      worktreeClean: true,
      bridgeOnline: bridge?.status === "online",
      claudeAvailable: bridge?.claudeAvailable ?? false,
    })
  );
  if (!guard.allowed) {
    throw new Error(`Harness blocked: ${guard.reason}`);
  }

  const now = Date.now();
  return await ctx.db.insert("autopilotBridgeJobs", {
    organizationId: args.organizationId,
    repoFullName: args.repoFullName,
    recipeId: recipe.id,
    recipeVersion: recipe.version,
    title: recipe.title,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  });
}

export const enqueueBridgeJob = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    repoFullName: v.string(),
    recipeId: v.string(),
    recipeVersion: v.number(),
    title: v.string(),
  },
  returns: v.id("autopilotBridgeJobs"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("autopilotBridgeJobs", {
      organizationId: args.organizationId,
      repoFullName: args.repoFullName,
      recipeId: args.recipeId,
      recipeVersion: args.recipeVersion,
      title: args.title,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const enqueueProductBrain = mutation({
  args: {
    organizationId: v.id("organizations"),
    repoFullName: v.string(),
  },
  returns: v.id("autopilotBridgeJobs"),
  handler: async (ctx, args) =>
    await enqueueHarnessJobForRecipe(ctx, {
      organizationId: args.organizationId,
      recipeId: "product-brain",
      repoFullName: args.repoFullName,
    }),
});

export const enqueueHarnessJob = mutation({
  args: {
    organizationId: v.id("organizations"),
    recipeId: v.string(),
    repoFullName: v.string(),
  },
  returns: v.id("autopilotBridgeJobs"),
  handler: async (ctx, args) =>
    await enqueueHarnessJobForRecipe(ctx, {
      organizationId: args.organizationId,
      recipeId: args.recipeId,
      repoFullName: args.repoFullName,
    }),
});
