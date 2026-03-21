import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { getAuthUser } from "./utils";

const ONBOARDING_STEPS = [
  "boardCreated",
  "brandingCustomized",
  "githubConnected",
  "widgetInstalled",
  "teamInvited",
  "firstFeedbackCreated",
] as const;

type StepName = (typeof ONBOARDING_STEPS)[number];

const DEFAULT_STEPS: Record<StepName, boolean> = {
  boardCreated: false,
  brandingCustomized: false,
  githubConnected: false,
  widgetInstalled: false,
  teamInvited: false,
  firstFeedbackCreated: false,
};

async function detectStepsFromOrgData(
  ctx: QueryCtx,
  organizationId: Id<"organizations">
): Promise<Record<StepName, boolean>> {
  const [org, githubConnection, firstFeedback, widget, members] =
    await Promise.all([
      ctx.db.get(organizationId),
      ctx.db
        .query("githubConnections")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId)
        )
        .first(),
      ctx.db
        .query("feedback")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId)
        )
        .first(),
      ctx.db
        .query("widgets")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId)
        )
        .first(),
      ctx.db
        .query("organizationMembers")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId)
        )
        .collect(),
    ]);

  return {
    boardCreated: org !== null,
    brandingCustomized:
      org !== null && (org.primaryColor != null || org.logo != null),
    githubConnected: githubConnection !== null,
    firstFeedbackCreated: firstFeedback !== null,
    widgetInstalled: widget !== null,
    teamInvited: members.length > 1,
  };
}

const stepsValidator = v.object({
  boardCreated: v.boolean(),
  brandingCustomized: v.boolean(),
  githubConnected: v.boolean(),
  widgetInstalled: v.boolean(),
  teamInvited: v.boolean(),
  firstFeedbackCreated: v.boolean(),
});

export const getProgress = query({
  args: { organizationId: v.id("organizations") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("onboardingProgress"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      userId: v.string(),
      steps: stepsValidator,
      dismissedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const progress = await ctx.db
      .query("onboardingProgress")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    const detected = await detectStepsFromOrgData(ctx, args.organizationId);

    if (!progress) {
      // No stored progress yet — return null if all auto-detected steps are false
      const hasAnyDetected = ONBOARDING_STEPS.some((s) => detected[s]);
      if (!hasAnyDetected) {
        return null;
      }
      // Return a synthetic progress object with auto-detected steps
      // The frontend will call syncAutoDetectedProgress to persist this
      return null;
    }

    // Merge stored with auto-detected (OR logic)
    const mergedSteps = { ...progress.steps };
    for (const step of ONBOARDING_STEPS) {
      if (detected[step]) {
        mergedSteps[step] = true;
      }
    }

    return {
      ...progress,
      steps: mergedSteps,
    };
  },
});

export const syncAutoDetectedProgress = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const detected = await detectStepsFromOrgData(ctx, args.organizationId);

    const progress = await ctx.db
      .query("onboardingProgress")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!progress) {
      const hasAnyDetected = ONBOARDING_STEPS.some((s) => detected[s]);
      if (!hasAnyDetected) {
        return null;
      }

      const steps = { ...DEFAULT_STEPS };
      for (const step of ONBOARDING_STEPS) {
        if (detected[step]) {
          steps[step] = true;
        }
      }
      const allDone = ONBOARDING_STEPS.every((s) => steps[s]);

      await ctx.db.insert("onboardingProgress", {
        organizationId: args.organizationId,
        userId: user._id,
        steps,
        createdAt: Date.now(),
        ...(allDone ? { completedAt: Date.now() } : {}),
      });
      return null;
    }

    if (progress.dismissedAt || progress.completedAt) {
      return null;
    }

    // Check if any auto-detected steps are newly true
    let hasChanges = false;
    const steps = { ...progress.steps };
    for (const step of ONBOARDING_STEPS) {
      if (detected[step] && !steps[step]) {
        steps[step] = true;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      const allDone = ONBOARDING_STEPS.every((s) => steps[s]);
      await ctx.db.patch(progress._id, {
        steps,
        ...(allDone ? { completedAt: Date.now() } : {}),
      });
    }

    return null;
  },
});

export const completeStep = mutation({
  args: {
    organizationId: v.id("organizations"),
    step: v.union(
      v.literal("boardCreated"),
      v.literal("brandingCustomized"),
      v.literal("githubConnected"),
      v.literal("widgetInstalled"),
      v.literal("teamInvited"),
      v.literal("firstFeedbackCreated")
    ),
  },
  returns: v.id("onboardingProgress"),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const progress = await ctx.db
      .query("onboardingProgress")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!progress) {
      const steps = { ...DEFAULT_STEPS, [args.step]: true };
      const allDone = ONBOARDING_STEPS.every((s) => steps[s]);

      return await ctx.db.insert("onboardingProgress", {
        organizationId: args.organizationId,
        userId: user._id,
        steps,
        createdAt: Date.now(),
        ...(allDone ? { completedAt: Date.now() } : {}),
      });
    }

    if (progress.dismissedAt || progress.completedAt) {
      return progress._id;
    }

    const steps = { ...progress.steps, [args.step]: true };
    const allDone = ONBOARDING_STEPS.every((s) => steps[s]);

    await ctx.db.patch(progress._id, {
      steps,
      ...(allDone ? { completedAt: Date.now() } : {}),
    });

    return progress._id;
  },
});

export const dismiss = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const progress = await ctx.db
      .query("onboardingProgress")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (progress) {
      await ctx.db.patch(progress._id, { dismissedAt: Date.now() });
    } else {
      // Create a dismissed progress entry so it doesn't reappear
      await ctx.db.insert("onboardingProgress", {
        organizationId: args.organizationId,
        userId: user._id,
        steps: DEFAULT_STEPS,
        createdAt: Date.now(),
        dismissedAt: Date.now(),
      });
    }

    return null;
  },
});
