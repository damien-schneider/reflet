import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const renamePreviousTag = internalMutation({
  args: {},
  handler: async (ctx) => {
    let snapshotsRenamed = 0;
    for (const snapshot of await ctx.db.query("releaseCommits").collect()) {
      if (snapshot.previousTag === undefined) {
        continue;
      }
      await ctx.db.patch(snapshot._id, {
        baseRef: snapshot.baseRef ?? snapshot.previousTag,
        previousTag: undefined,
      });
      snapshotsRenamed++;
    }
    return { snapshotsRenamed };
  },
  returns: v.object({ snapshotsRenamed: v.number() }),
});
