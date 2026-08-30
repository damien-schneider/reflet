import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const stripSyncDirection = internalMutation({
  args: {},
  handler: async (ctx) => {
    let organizationsStripped = 0;
    for (const org of await ctx.db.query("organizations").collect()) {
      const settings = org.changelogSettings;
      if (!(settings && "syncDirection" in settings)) {
        continue;
      }
      const { syncDirection, ...changelogSettings } = settings;
      await ctx.db.patch(org._id, { changelogSettings });
      organizationsStripped++;
    }

    let setupsStripped = 0;
    for (const setup of await ctx.db.query("projectSetupResults").collect()) {
      const config = setup.changelogConfig;
      if (!(config && "syncDirection" in config)) {
        continue;
      }
      const { syncDirection, ...changelogConfig } = config;
      await ctx.db.patch(setup._id, { changelogConfig });
      setupsStripped++;
    }

    return { organizationsStripped, setupsStripped };
  },
  returns: v.object({
    organizationsStripped: v.number(),
    setupsStripped: v.number(),
  }),
});
