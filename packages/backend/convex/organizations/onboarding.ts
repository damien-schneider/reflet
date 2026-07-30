import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

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
  firstFeedbackCreated: false,
  githubConnected: false,
  teamInvited: false,
  widgetInstalled: false,
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
      org !== null && (org.primaryColor !== null || org.logo !== null),
    firstFeedbackCreated: firstFeedback !== null,
    githubConnected: githubConnection !== null,
    teamInvited: members.length > 1,
    widgetInstalled: widget !== null,
  };
}

const stepsValidator = v.object({
  boardCreated: v.boolean(),
  brandingCustomized: v.boolean(),
  firstFeedbackCreated: v.boolean(),
  githubConnected: v.boolean(),
  teamInvited: v.boolean(),
  widgetInstalled: v.boolean(),
});

export const getProgress = query({
  args: { organizationId: v.id("organizations") },
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
  returns: v.union(
    v.null(),
    v.object({
      _creationTime: v.number(),
      _id: v.id("onboardingProgress"),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
      dismissedAt: v.optional(v.number()),
      organizationId: v.id("organizations"),
      steps: stepsValidator,
      userId: v.string(),
    })
  ),
});

export const syncAutoDetectedProgress = mutation({
  args: { organizationId: v.id("organizations") },
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
        createdAt: Date.now(),
        organizationId: args.organizationId,
        steps,
        userId: user._id,
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
  returns: v.null(),
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
        createdAt: Date.now(),
        organizationId: args.organizationId,
        steps,
        userId: user._id,
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
  returns: v.id("onboardingProgress"),
});

export const dismiss = mutation({
  args: { organizationId: v.id("organizations") },
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
        createdAt: Date.now(),
        dismissedAt: Date.now(),
        organizationId: args.organizationId,
        steps: DEFAULT_STEPS,
        userId: user._id,
      });
    }

    return null;
  },
  returns: v.null(),
});
