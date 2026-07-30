import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  domainStatus,
  feedbackStatus,
  invitationStatus,
  memberRole,
  subscriptionStatus,
  subscriptionTier,
} from "../shared/validators";

export const organizationTables = {
  activityLogs: defineTable({
    action: v.string(),
    authorId: v.string(),
    createdAt: v.number(),
    details: v.optional(v.string()),
    feedbackId: v.optional(v.id("feedback")),
    organizationId: v.id("organizations"),
  })
    .index("by_organization", ["organizationId"])
    .index("by_feedback", ["feedbackId"]),

  invitations: defineTable({
    createdAt: v.number(),
    email: v.string(),
    expiresAt: v.number(),
    inviterId: v.string(),
    lastSentAt: v.optional(v.number()),
    organizationId: v.id("organizations"),
    role: memberRole,
    status: invitationStatus,
    token: v.string(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_email", ["email"])
    .index("by_token", ["token"])
    .index("by_status", ["status"]),

  milestoneFeedback: defineTable({
    addedAt: v.number(),
    addedBy: v.optional(v.string()),
    feedbackId: v.id("feedback"),
    milestoneId: v.id("milestones"),
  })
    .index("by_milestone", ["milestoneId"])
    .index("by_feedback", ["feedbackId"])
    .index("by_milestone_feedback", ["milestoneId", "feedbackId"]),

  milestones: defineTable({
    color: v.string(),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    description: v.optional(v.string()),
    emoji: v.optional(v.string()),
    isPublic: v.boolean(),
    name: v.string(),
    order: v.number(),
    organizationId: v.id("organizations"),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("archived")
    ),
    targetDate: v.optional(v.number()),
    timeHorizon: v.union(
      v.literal("now"),
      v.literal("next_month"),
      v.literal("next_quarter"),
      v.literal("half_year"),
      v.literal("next_year"),
      v.literal("future")
    ),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_horizon", ["organizationId", "timeHorizon"]),

  onboardingProgress: defineTable({
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    dismissedAt: v.optional(v.number()),
    organizationId: v.id("organizations"),
    steps: v.object({
      boardCreated: v.boolean(),
      brandingCustomized: v.boolean(),
      firstFeedbackCreated: v.boolean(),
      githubConnected: v.boolean(),
      teamInvited: v.boolean(),
      widgetInstalled: v.boolean(),
    }),
    userId: v.string(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_user", ["organizationId", "userId"]),

  organizationMembers: defineTable({
    createdAt: v.number(),
    organizationId: v.id("organizations"),
    role: memberRole,
    userId: v.string(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["organizationId", "userId"]),

  organizationStatuses: defineTable({
    color: v.string(),
    createdAt: v.number(),
    icon: v.optional(v.string()),
    name: v.string(),
    order: v.number(),
    organizationId: v.id("organizations"),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_order", ["organizationId", "order"]),
  organizations: defineTable({
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
    createdAt: v.number(),
    customCss: v.optional(v.string()),
    customDomain: v.optional(v.string()),
    customDomainError: v.optional(v.string()),
    customDomainLastCheckedAt: v.optional(v.number()),
    customDomainStatus: v.optional(domainStatus),
    customDomainVerification: v.optional(
      v.array(
        v.object({
          domain: v.string(),
          reason: v.optional(v.string()),
          type: v.string(),
          value: v.string(),
        })
      )
    ),
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
        defaultStatus: v.optional(feedbackStatus),
        defaultTagId: v.optional(v.id("tags")),
        defaultView: v.optional(
          v.union(v.literal("roadmap"), v.literal("feed"))
        ),
        milestoneStyle: v.optional(
          v.union(
            v.literal("track"),
            v.literal("editorial-accordion"),
            v.literal("dashboard-timeline")
          )
        ),
        requireApproval: v.optional(v.boolean()),
      })
    ),
    hideBranding: v.optional(v.boolean()),
    isPublic: v.boolean(),
    logo: v.optional(v.string()),
    name: v.string(),
    primaryColor: v.optional(v.string()),
    setupCompleted: v.optional(v.boolean()),
    setupMethod: v.optional(
      v.union(v.literal("github"), v.literal("manual"), v.literal("skipped"))
    ),
    slug: v.string(),
    staleFeedbackSettings: v.optional(
      v.object({
        action: v.union(v.literal("archive"), v.literal("close")),
        daysInactive: v.number(),
        enabled: v.boolean(),
        excludeStatuses: v.optional(v.array(feedbackStatus)),
      })
    ),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionStatus,
    subscriptionTier,
    supportEnabled: v.optional(v.boolean()),
  })
    .index("by_slug", ["slug"])
    .index("by_custom_domain", ["customDomain"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .searchIndex("search_name", { searchField: "name" }),

  tags: defineTable({
    color: v.string(),
    createdAt: v.number(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    isDoneStatus: v.optional(v.boolean()),
    isRoadmapLane: v.optional(v.boolean()),
    laneOrder: v.optional(v.number()),
    name: v.string(),
    organizationId: v.id("organizations"),
    settings: v.optional(
      v.object({
        defaultStatus: v.optional(feedbackStatus),
        isPublic: v.optional(v.boolean()),
        requireApproval: v.optional(v.boolean()),
      })
    ),
    slug: v.string(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_slug", ["organizationId", "slug"]),
};
