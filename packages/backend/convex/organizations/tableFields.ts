import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  feedbackStatus,
  invitationStatus,
  memberRole,
  subscriptionStatus,
  subscriptionTier,
} from "../shared/validators";

export const organizationTables = {
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.string()),
    createdAt: v.number(),
    primaryColor: v.optional(v.string()),
    customCss: v.optional(v.string()),
    isPublic: v.boolean(),
    changelogSettings: v.optional(
      v.object({
        autoPublishImported: v.optional(v.boolean()),
        autoVersioning: v.optional(v.boolean()),
        pushToGithubOnPublish: v.optional(v.boolean()),
        syncDirection: v.optional(v.string()),
        targetBranch: v.optional(v.string()),
        versionIncrement: v.optional(v.string()),
        versionPrefix: v.optional(v.string()),
      })
    ),
    subscriptionTier,
    subscriptionStatus,
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    customDomain: v.optional(v.string()),
    supportEnabled: v.optional(v.boolean()),
    staleFeedbackSettings: v.optional(
      v.object({
        enabled: v.boolean(),
        daysInactive: v.number(),
        action: v.union(v.literal("archive"), v.literal("close")),
        excludeStatuses: v.optional(v.array(feedbackStatus)),
      })
    ),
    hideBranding: v.optional(v.boolean()),
    feedbackSettings: v.optional(
      v.object({
        allowAnonymousVoting: v.optional(v.boolean()),
        cardStyle: v.optional(
          v.union(
            v.literal("sweep-corner"),
            v.literal("minimal-notch"),
            v.literal("editorial-feed")
          )
        ),
        defaultTagId: v.optional(v.id("tags")),
        defaultView: v.optional(
          v.union(v.literal("roadmap"), v.literal("feed"))
        ),
        requireApproval: v.optional(v.boolean()),
        defaultStatus: v.optional(feedbackStatus),
        milestoneStyle: v.optional(
          v.union(
            v.literal("track"),
            v.literal("editorial-accordion"),
            v.literal("dashboard-timeline")
          )
        ),
      })
    ),
  })
    .index("by_slug", ["slug"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .searchIndex("search_name", { searchField: "name" }),

  organizationMembers: defineTable({
    organizationId: v.id("organizations"),
    userId: v.string(),
    role: memberRole,
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["organizationId", "userId"]),

  invitations: defineTable({
    organizationId: v.id("organizations"),
    email: v.string(),
    role: memberRole,
    status: invitationStatus,
    expiresAt: v.number(),
    createdAt: v.number(),
    inviterId: v.string(),
    token: v.string(),
    lastSentAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_email", ["email"])
    .index("by_token", ["token"])
    .index("by_status", ["status"]),

  organizationStatuses: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_order", ["organizationId", "order"]),

  milestones: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    emoji: v.optional(v.string()),
    color: v.string(),
    timeHorizon: v.union(
      v.literal("now"),
      v.literal("next_month"),
      v.literal("next_quarter"),
      v.literal("half_year"),
      v.literal("next_year"),
      v.literal("future")
    ),
    targetDate: v.optional(v.number()),
    order: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("archived")
    ),
    completedAt: v.optional(v.number()),
    isPublic: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_horizon", ["organizationId", "timeHorizon"]),

  milestoneFeedback: defineTable({
    milestoneId: v.id("milestones"),
    feedbackId: v.id("feedback"),
    addedAt: v.number(),
    addedBy: v.optional(v.string()),
  })
    .index("by_milestone", ["milestoneId"])
    .index("by_feedback", ["feedbackId"])
    .index("by_milestone_feedback", ["milestoneId", "feedbackId"]),

  tags: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    slug: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    isDoneStatus: v.optional(v.boolean()),
    isRoadmapLane: v.optional(v.boolean()),
    laneOrder: v.optional(v.number()),
    settings: v.optional(
      v.object({
        requireApproval: v.optional(v.boolean()),
        defaultStatus: v.optional(feedbackStatus),
        isPublic: v.optional(v.boolean()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_slug", ["organizationId", "slug"]),

  activityLogs: defineTable({
    organizationId: v.id("organizations"),
    feedbackId: v.optional(v.id("feedback")),
    authorId: v.string(),
    action: v.string(),
    details: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_feedback", ["feedbackId"]),

  onboardingProgress: defineTable({
    organizationId: v.id("organizations"),
    userId: v.string(),
    steps: v.object({
      boardCreated: v.boolean(),
      brandingCustomized: v.boolean(),
      githubConnected: v.boolean(),
      widgetInstalled: v.boolean(),
      teamInvited: v.boolean(),
      firstFeedbackCreated: v.boolean(),
    }),
    dismissedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_user", ["organizationId", "userId"]),
};
