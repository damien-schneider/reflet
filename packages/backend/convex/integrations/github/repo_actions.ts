/**
 * Repository read actions callable from the React client.
 * The installation token is minted and used server-side only — it never
 * reaches the browser.
 */
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { action } from "../../_generated/server";
import { authComponent } from "../../auth/auth";
import { isOrgAdmin } from "../../shared/membership";

interface RepoAccess {
  repositoryFullName: string;
  token: string;
}

interface Branch {
  isProtected: boolean;
  name: string;
}

async function requireRepoAccess(
  ctx: ActionCtx,
  organizationId: Id<"organizations">
): Promise<RepoAccess> {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  const membership = await ctx.runQuery(
    internal.shared.access.membershipForUser,
    { organizationId, userId: user._id }
  );
  if (!isOrgAdmin(membership?.role)) {
    throw new Error("Only admins can browse the connected repository");
  }
  const connection = await ctx.runQuery(
    internal.integrations.github.queries.getConnectionInternal,
    { organizationId }
  );
  if (!connection) {
    throw new Error("No GitHub connection found");
  }

  if (!connection.repositoryFullName) {
    throw new Error("No repository connected");
  }

  const { token } = await ctx.runAction(
    internal.integrations.github.node_actions.getInstallationTokenInternal,
    { installationId: connection.installationId }
  );

  return { repositoryFullName: connection.repositoryFullName, token };
}

export const listBranches = action({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args): Promise<Branch[]> => {
    const { repositoryFullName, token } = await requireRepoAccess(
      ctx,
      args.organizationId
    );

    return await ctx.runAction(
      internal.integrations.github.release_actions.fetchBranches,
      { installationToken: token, repositoryFullName }
    );
  },
});
