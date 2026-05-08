import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";

const CONNECTION_INDEXED_TABLES = [
  "githubReleases",
  "githubWebhookEvents",
  "githubLabelMappings",
  "githubIssues",
] as const;

const ORGANIZATION_CONNECTION_TABLES = [
  "repoAnalysis",
  "projectSetupResults",
] as const;

async function deleteConnectionRows(
  ctx: MutationCtx,
  connectionId: Id<"githubConnections">,
  organizationId: Id<"organizations">
): Promise<void> {
  for (const table of CONNECTION_INDEXED_TABLES) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connectionId)
      )
      .collect();

    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
  }

  for (const table of ORGANIZATION_CONNECTION_TABLES) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();

    for (const row of rows) {
      if (row.githubConnectionId === connectionId) {
        await ctx.db.delete(row._id);
      }
    }
  }
}

/**
 * Internal mutation to save a user-level GitHub installation
 * Creates or updates a userGithubConnections row for the given user
 */
export const saveUserInstallation = internalMutation({
  args: {
    userId: v.string(),
    installationId: v.string(),
    accountType: v.union(v.literal("user"), v.literal("organization")),
    accountLogin: v.string(),
    accountAvatarUrl: v.optional(v.string()),
  },
  returns: v.id("userGithubConnections"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userGithubConnections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        installationId: args.installationId,
        accountType: args.accountType,
        accountLogin: args.accountLogin,
        accountAvatarUrl: args.accountAvatarUrl,
        status: "connected",
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("userGithubConnections", {
      userId: args.userId,
      installationId: args.installationId,
      accountType: args.accountType,
      accountLogin: args.accountLogin,
      accountAvatarUrl: args.accountAvatarUrl,
      status: "connected",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Link a repo to an org using a team member's GitHub installation
 * Creates or updates a githubConnections row with linkedByUserId
 */
export const linkRepoToOrg = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userGithubConnectionId: v.id("userGithubConnections"),
    linkedByUserId: v.string(),
  },
  returns: v.id("githubConnections"),
  handler: async (ctx, args) => {
    const userConnection = await ctx.db.get(args.userGithubConnectionId);
    if (!userConnection) {
      throw new Error("User GitHub connection not found");
    }

    const existing = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        installationId: userConnection.installationId,
        accountType: userConnection.accountType,
        accountLogin: userConnection.accountLogin,
        accountAvatarUrl: userConnection.accountAvatarUrl,
        linkedByUserId: args.linkedByUserId,
        status: "connected",
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("githubConnections", {
      organizationId: args.organizationId,
      installationId: userConnection.installationId,
      accountType: userConnection.accountType,
      accountLogin: userConnection.accountLogin,
      accountAvatarUrl: userConnection.accountAvatarUrl,
      linkedByUserId: args.linkedByUserId,
      status: "connected",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Handle a member being removed from an org
 * Marks any githubConnections linked by that user as "owner_left"
 */
export const handleMemberRemoved = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    for (const connection of connections) {
      if (connection.linkedByUserId === args.userId) {
        await ctx.db.patch(connection._id, {
          status: "owner_left",
          updatedAt: Date.now(),
        });
      }
    }
    return null;
  },
});

/**
 * Internal mutation to handle GitHub App uninstallation
 * Marks userGithubConnections as error and deletes all org connections sharing that installationId
 */
export const handleInstallationDeleted = internalMutation({
  args: {
    installationId: v.string(),
  },
  returns: v.union(
    v.object({ deleted: v.literal(false), reason: v.literal("not_found") }),
    v.object({ deleted: v.literal(true) })
  ),
  handler: async (
    ctx,
    args
  ): Promise<{ deleted: false; reason: "not_found" } | { deleted: true }> => {
    const now = Date.now();
    const userConnections = await ctx.db
      .query("userGithubConnections")
      .withIndex("by_installation", (q) =>
        q.eq("installationId", args.installationId)
      )
      .collect();

    for (const userConnection of userConnections) {
      await ctx.db.patch(userConnection._id, {
        status: "error",
        updatedAt: now,
      });
    }

    // Find ALL org connections with this installationId and clean up
    const orgConnections = await ctx.db
      .query("githubConnections")
      .withIndex("by_installation", (q) =>
        q.eq("installationId", args.installationId)
      )
      .collect();

    if (orgConnections.length === 0 && userConnections.length === 0) {
      return { deleted: false, reason: "not_found" };
    }

    for (const connection of orgConnections) {
      await deleteConnectionRows(
        ctx,
        connection._id,
        connection.organizationId
      );
      await ctx.db.delete(connection._id);
    }

    return { deleted: true };
  },
});
