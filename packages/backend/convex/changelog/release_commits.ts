import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { isOrgMemberViewer } from "../shared/access";

export async function findMaintainerNotes(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  tagName: string
): Promise<string | undefined> {
  const mirror = await ctx.db
    .query("githubReleases")
    .withIndex("by_org_tag", (q) =>
      q.eq("organizationId", organizationId).eq("tagName", tagName)
    )
    .first();
  return mirror?.body || undefined;
}

export const getReleaseCommits = query({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!(release && (await isOrgMemberViewer(ctx, release.organizationId)))) {
      return null;
    }

    const snapshot = await ctx.db
      .query("releaseCommits")
      .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
      .first();
    if (!snapshot) {
      return null;
    }
    return {
      ...snapshot,
      maintainerNotes: snapshot.headRef
        ? await findMaintainerNotes(
            ctx,
            release.organizationId,
            snapshot.headRef
          )
        : undefined,
    };
  },
});
