import { type Infer, v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { assertSuperAdmin } from "../../shared/access";
import { findSupportEmailSettings } from "./delivery_policy";
import { sendingPauseReason } from "./tableFields";

const pausedOrganization = v.object({
  name: v.string(),
  organizationId: v.id("organizations"),
  pausedAt: v.number(),
  reason: v.optional(sendingPauseReason),
  slug: v.string(),
});

type PausedOrganization = Infer<typeof pausedOrganization>;

export const suspendSending = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await assertSuperAdmin(ctx);
    const now = Date.now();
    const pause = {
      sendingPausedAt: now,
      sendingPauseReason: "platform" as const,
    };
    const settings = await findSupportEmailSettings(ctx, args.organizationId);
    if (settings) {
      await ctx.db.patch(settings._id, pause);
    } else {
      await ctx.db.insert("supportEmailSettings", {
        createdAt: now,
        organizationId: args.organizationId,
        ...pause,
      });
    }
    return null;
  },
  returns: v.null(),
});

export const resumeSending = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await assertSuperAdmin(ctx);
    const settings = await findSupportEmailSettings(ctx, args.organizationId);
    if (settings) {
      await ctx.db.patch(settings._id, {
        sendingPausedAt: undefined,
        sendingPauseReason: undefined,
      });
    }
    return null;
  },
  returns: v.null(),
});

export const listPausedOrganizations = query({
  args: {},
  handler: async (ctx) => {
    await assertSuperAdmin(ctx);
    const allSettings = await ctx.db.query("supportEmailSettings").collect();
    const paused: PausedOrganization[] = [];
    for (const settings of allSettings) {
      if (settings.sendingPausedAt === undefined) {
        continue;
      }
      const organization = await ctx.db.get(settings.organizationId);
      if (organization) {
        paused.push({
          name: organization.name,
          organizationId: organization._id,
          pausedAt: settings.sendingPausedAt,
          reason: settings.sendingPauseReason,
          slug: organization.slug,
        });
      }
    }
    return paused;
  },
  returns: v.array(pausedOrganization),
});
