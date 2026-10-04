import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const renameHasConventionalCommits = internalMutation({
  args: {},
  handler: async (ctx) => {
    let setupsRenamed = 0;
    for (const setup of await ctx.db.query("projectSetupResults").collect()) {
      const config = setup.changelogConfig;
      if (!(config && "hasConventionalCommits" in config)) {
        continue;
      }
      const { hasConventionalCommits, ...changelogConfig } = config;
      await ctx.db.patch(setup._id, {
        changelogConfig: {
          ...changelogConfig,
          hasSemverTags:
            changelogConfig.hasSemverTags ?? hasConventionalCommits,
        },
      });
      setupsRenamed++;
    }
    return { setupsRenamed };
  },
  returns: v.object({ setupsRenamed: v.number() }),
});
