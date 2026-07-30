import { internal } from "../_generated/api";
import type { Id, TableNames } from "../_generated/dataModel";
import type { httpAction } from "../_generated/server";
import {
  bool,
  num,
  optionalId,
  requireStr,
  str,
  strArr,
} from "../http/helpers";

// ============================================
// TYPES
// ============================================

type ActionCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

type ToolHandler = (
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  params: Record<string, unknown>
) => Promise<unknown>;

interface McpToolDefinition {
  description: string;
  inputSchema: Record<string, unknown>;
  name: string;
}

interface ToolRegistration {
  definition: McpToolDefinition;
  handler: ToolHandler;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function asId<T extends TableNames>(value: unknown, fieldName: string): Id<T> {
  return requireStr(value, fieldName) as Id<T>;
}

// ============================================
// TOOL REGISTRY
// ============================================

const tools: ToolRegistration[] = [];

function defineTool(
  name: string,
  description: string,
  inputSchema: Record<string, unknown>,
  handler: ToolHandler
): void {
  tools.push({
    definition: { description, inputSchema, name },
    handler,
  });
}

// ============================================
// FEEDBACK TOOLS
// ============================================

defineTool(
  "feedback_list",
  "List feedback items. Filter by status, tags, or search text. Sort by votes, newest, oldest, or comments.",
  {
    properties: {
      limit: {
        description: "Max items to return (default: 50, max: 100)",
        type: "number",
      },
      offset: { description: "Pagination offset", type: "number" },
      search: {
        description: "Search in title and description",
        type: "string",
      },
      sortBy: {
        description: "Sort order (default: votes)",
        enum: ["votes", "newest", "oldest", "comments"],
        type: "string",
      },
      status: {
        description: "Filter by feedback status",
        enum: [
          "open",
          "under_review",
          "planned",
          "in_progress",
          "completed",
          "closed",
        ],
        type: "string",
      },
      statusId: {
        description: "Filter by organization status ID",
        type: "string",
      },
      tagId: { description: "Filter by tag ID", type: "string" },
    },
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.feedback.api_public.listFeedbackByOrganization, {
      limit: num(params.limit),
      offset: num(params.offset),
      organizationId,
      search: str(params.search),
      sortBy: str(params.sortBy) as
        | "votes"
        | "newest"
        | "oldest"
        | "comments"
        | undefined,
      status: str(params.status) as
        | "open"
        | "under_review"
        | "planned"
        | "in_progress"
        | "completed"
        | "closed"
        | undefined,
      statusId: optionalId<"organizationStatuses">(params.statusId),
      tagId: optionalId<"tags">(params.tagId),
    })
);

defineTool(
  "feedback_get",
  "Get a single feedback item by ID with full details including tags, vote count, and status.",
  {
    properties: {
      feedbackId: { description: "The feedback item ID", type: "string" },
    },
    required: ["feedbackId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.feedback.api_public.getFeedbackByOrganization, {
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
    })
);

defineTool(
  "feedback_create",
  "Create a new feedback item (feature request, bug report, etc.).",
  {
    properties: {
      description: {
        description:
          "Feedback description (rich text or markdown, max 10000 chars)",
        type: "string",
      },
      tagId: { description: "Tag ID to assign", type: "string" },
      title: {
        description: "Feedback title (max 100 chars)",
        type: "string",
      },
    },
    required: ["title", "description"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.feedback.api_public.createFeedbackByOrganization, {
      description: requireStr(params.description, "description"),
      organizationId,
      tagId: optionalId<"tags">(params.tagId),
      title: requireStr(params.title, "title"),
    })
);

defineTool(
  "feedback_update",
  "Update a feedback item's title or description.",
  {
    properties: {
      description: { description: "New description", type: "string" },
      feedbackId: { description: "The feedback item ID", type: "string" },
      title: { description: "New title", type: "string" },
    },
    required: ["feedbackId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateFeedback, {
      description: str(params.description),
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
      title: str(params.title),
    })
);

defineTool(
  "feedback_delete",
  "Soft-delete a feedback item. Can be restored later.",
  {
    properties: {
      feedbackId: {
        description: "The feedback item ID to delete",
        type: "string",
      },
    },
    required: ["feedbackId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.deleteFeedback, {
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
    })
);

defineTool(
  "feedback_restore",
  "Restore a previously deleted feedback item.",
  {
    properties: {
      feedbackId: {
        description: "The feedback item ID to restore",
        type: "string",
      },
    },
    required: ["feedbackId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.restoreFeedback, {
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
    })
);

defineTool(
  "feedback_assign",
  "Assign a feedback item to a team member, or unassign by omitting assigneeId.",
  {
    properties: {
      assigneeId: {
        description: "User ID of the assignee (omit to unassign)",
        type: "string",
      },
      feedbackId: { description: "The feedback item ID", type: "string" },
    },
    required: ["feedbackId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.assignFeedback, {
      assigneeId: str(params.assigneeId),
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
    })
);

defineTool(
  "feedback_set_status",
  "Change a feedback item's status on the roadmap. Provide either statusId (organization status) or status (generic status).",
  {
    properties: {
      feedbackId: { description: "The feedback item ID", type: "string" },
      status: {
        description: "Generic status to set",
        enum: [
          "open",
          "under_review",
          "planned",
          "in_progress",
          "completed",
          "closed",
        ],
        type: "string",
      },
      statusId: {
        description: "Organization status ID to set",
        type: "string",
      },
    },
    required: ["feedbackId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.setFeedbackStatus, {
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
      status: str(params.status) as
        | "open"
        | "under_review"
        | "planned"
        | "in_progress"
        | "completed"
        | "closed"
        | undefined,
      statusId: optionalId<"organizationStatuses">(params.statusId),
    })
);

defineTool(
  "feedback_add_tag",
  "Add one or more tags to a feedback item.",
  {
    properties: {
      feedbackId: { description: "The feedback item ID", type: "string" },
      tagIds: {
        description: "Tag IDs to add",
        items: { type: "string" },
        type: "array",
      },
    },
    required: ["feedbackId", "tagIds"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateFeedbackTags, {
      addTagIds: strArr(params.tagIds) as Id<"tags">[] | undefined,
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
    })
);

defineTool(
  "feedback_remove_tag",
  "Remove one or more tags from a feedback item.",
  {
    properties: {
      feedbackId: { description: "The feedback item ID", type: "string" },
      tagIds: {
        description: "Tag IDs to remove",
        items: { type: "string" },
        type: "array",
      },
    },
    required: ["feedbackId", "tagIds"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateFeedbackTags, {
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
      removeTagIds: strArr(params.tagIds) as Id<"tags">[] | undefined,
    })
);

defineTool(
  "feedback_set_priority",
  "Set the priority level of a feedback item.",
  {
    properties: {
      feedbackId: { description: "The feedback item ID", type: "string" },
      priority: {
        description: "Priority level",
        enum: ["critical", "high", "medium", "low", "none"],
        type: "string",
      },
    },
    required: ["feedbackId", "priority"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateFeedbackAnalysis, {
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
      priority: requireStr(params.priority, "priority") as
        | "critical"
        | "high"
        | "medium"
        | "low"
        | "none",
    })
);

defineTool(
  "feedback_set_complexity",
  "Set the complexity level of a feedback item.",
  {
    properties: {
      complexity: {
        description: "Complexity level",
        enum: ["trivial", "simple", "moderate", "complex", "very_complex"],
        type: "string",
      },
      feedbackId: { description: "The feedback item ID", type: "string" },
    },
    required: ["feedbackId", "complexity"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateFeedbackAnalysis, {
      complexity: requireStr(params.complexity, "complexity") as
        | "trivial"
        | "simple"
        | "moderate"
        | "complex"
        | "very_complex",
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
    })
);

defineTool(
  "feedback_set_deadline",
  "Set a deadline for a feedback item.",
  {
    properties: {
      deadline: {
        description: "Deadline as Unix timestamp in milliseconds",
        type: "number",
      },
      feedbackId: { description: "The feedback item ID", type: "string" },
    },
    required: ["feedbackId", "deadline"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateFeedbackAnalysis, {
      deadline: num(params.deadline),
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
    })
);

// ============================================
// COMMENT TOOLS
// ============================================

defineTool(
  "comment_list",
  "List comments on a feedback item. Returns threaded comments with author info.",
  {
    properties: {
      feedbackId: { description: "The feedback item ID", type: "string" },
      sortBy: {
        description: "Sort order (default: oldest)",
        enum: ["newest", "oldest"],
        type: "string",
      },
    },
    required: ["feedbackId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.feedback.api_public.listCommentsByOrganization, {
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
      sortBy: str(params.sortBy) as "newest" | "oldest" | undefined,
    })
);

defineTool(
  "comment_create",
  "Add a comment to a feedback item. Can be a reply to another comment.",
  {
    properties: {
      body: {
        description: "Comment text (max 5000 chars)",
        type: "string",
      },
      feedbackId: { description: "The feedback item ID", type: "string" },
      parentId: {
        description: "Parent comment ID for threaded replies",
        type: "string",
      },
    },
    required: ["feedbackId", "body"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.feedback.api_public.addCommentByOrganization, {
      body: requireStr(params.body, "body"),
      // Admin comments via MCP don't have an external user - use a placeholder
      // Note: addCommentByOrganization requires externalUserId; for admin
      // comments we need to handle this differently. For now, this tool
      // requires the admin to provide context about the commenter.
      externalUserId: asId<"externalUsers">(
        params.externalUserId,
        "externalUserId"
      ),
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
      parentId: optionalId<"comments">(params.parentId),
    })
);

defineTool(
  "comment_update",
  "Edit an existing comment's body text.",
  {
    properties: {
      body: { description: "New comment text", type: "string" },
      commentId: { description: "The comment ID", type: "string" },
    },
    required: ["commentId", "body"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateComment, {
      body: requireStr(params.body, "body"),
      commentId: asId<"comments">(params.commentId, "commentId"),
      organizationId,
    })
);

defineTool(
  "comment_delete",
  "Delete a comment.",
  {
    properties: {
      commentId: {
        description: "The comment ID to delete",
        type: "string",
      },
    },
    required: ["commentId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.deleteComment, {
      commentId: asId<"comments">(params.commentId, "commentId"),
      organizationId,
    })
);

defineTool(
  "comment_mark_official",
  "Toggle a comment as an official response from the team.",
  {
    properties: {
      commentId: { description: "The comment ID", type: "string" },
      isOfficial: {
        description: "Whether the comment is an official response",
        type: "boolean",
      },
    },
    required: ["commentId", "isOfficial"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.markCommentOfficial, {
      commentId: asId<"comments">(params.commentId, "commentId"),
      isOfficial: params.isOfficial === true,
      organizationId,
    })
);

// ============================================
// TAG TOOLS
// ============================================

defineTool(
  "tag_list",
  "List all tags in the organization. Tags are used to categorize feedback items.",
  { properties: {}, type: "object" },
  async (ctx, organizationId) =>
    ctx.runQuery(internal.admin_api.tags.listTags, { organizationId })
);

defineTool(
  "tag_create",
  "Create a new tag for categorizing feedback.",
  {
    properties: {
      color: {
        description: "Tag color (e.g., 'blue', 'red', 'green')",
        type: "string",
      },
      description: { description: "Tag description", type: "string" },
      icon: { description: "Emoji icon (e.g., fire, box)", type: "string" },
      isPublic: {
        description: "Whether the tag is visible in the public widget",
        type: "boolean",
      },
      name: { description: "Tag name", type: "string" },
    },
    required: ["name", "color"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.tags.createTag, {
      color: requireStr(params.color, "color"),
      description: str(params.description),
      icon: str(params.icon),
      isPublic: bool(params.isPublic),
      name: requireStr(params.name, "name"),
      organizationId,
    })
);

defineTool(
  "tag_update",
  "Update an existing tag's properties.",
  {
    properties: {
      color: { description: "New tag color", type: "string" },
      description: { description: "New description", type: "string" },
      icon: { description: "New emoji icon", type: "string" },
      isPublic: {
        description: "Whether the tag is visible in the public widget",
        type: "boolean",
      },
      name: { description: "New tag name", type: "string" },
      tagId: { description: "The tag ID", type: "string" },
    },
    required: ["tagId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.tags.updateTag, {
      color: str(params.color),
      description: str(params.description),
      icon: str(params.icon),
      isPublic: bool(params.isPublic),
      name: str(params.name),
      organizationId,
      tagId: asId<"tags">(params.tagId, "tagId"),
    })
);

defineTool(
  "tag_delete",
  "Delete a tag. This will remove the tag from all feedback items.",
  {
    properties: {
      tagId: { description: "The tag ID to delete", type: "string" },
    },
    required: ["tagId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.tags.deleteTag, {
      organizationId,
      tagId: asId<"tags">(params.tagId, "tagId"),
    })
);

// ============================================
// RELEASE TOOLS
// ============================================

defineTool(
  "release_list",
  "List releases (changelog entries). Filter by draft/published status.",
  {
    properties: {
      limit: { description: "Max items to return", type: "number" },
      offset: { description: "Pagination offset", type: "number" },
      status: {
        description: "Filter by publish status (default: all)",
        enum: ["draft", "published", "all"],
        type: "string",
      },
    },
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.admin_api.releases.listReleases, {
      limit: num(params.limit),
      offset: num(params.offset),
      organizationId,
      status: str(params.status) as "draft" | "published" | "all" | undefined,
    })
);

defineTool(
  "release_get",
  "Get a single release with its linked feedback items.",
  {
    properties: {
      releaseId: { description: "The release ID", type: "string" },
    },
    required: ["releaseId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.admin_api.releases.getRelease, {
      organizationId,
      releaseId: asId<"releases">(params.releaseId, "releaseId"),
    })
);

defineTool(
  "release_create",
  "Create a new draft release (changelog entry).",
  {
    properties: {
      description: {
        description: "Release description/notes (rich text or markdown)",
        type: "string",
      },
      title: { description: "Release title", type: "string" },
      version: {
        description: "Version string (e.g., 'v1.2.0')",
        type: "string",
      },
    },
    required: ["title"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.releases.createRelease, {
      description: str(params.description),
      organizationId,
      title: requireStr(params.title, "title"),
      version: str(params.version),
    })
);

defineTool(
  "release_update",
  "Update a release's title, description, or version.",
  {
    properties: {
      description: {
        description: "New description/notes",
        type: "string",
      },
      releaseId: { description: "The release ID", type: "string" },
      title: { description: "New title", type: "string" },
      version: { description: "New version string", type: "string" },
    },
    required: ["releaseId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.releases.updateRelease, {
      description: str(params.description),
      organizationId,
      releaseId: asId<"releases">(params.releaseId, "releaseId"),
      title: str(params.title),
      version: str(params.version),
    })
);

defineTool(
  "release_publish",
  "Publish a draft release, making it visible in the public changelog.",
  {
    properties: {
      releaseId: {
        description: "The release ID to publish",
        type: "string",
      },
    },
    required: ["releaseId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.releases.publishRelease, {
      organizationId,
      releaseId: asId<"releases">(params.releaseId, "releaseId"),
    })
);

defineTool(
  "release_unpublish",
  "Unpublish a release, returning it to draft status.",
  {
    properties: {
      releaseId: {
        description: "The release ID to unpublish",
        type: "string",
      },
    },
    required: ["releaseId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.releases.unpublishRelease, {
      organizationId,
      releaseId: asId<"releases">(params.releaseId, "releaseId"),
    })
);

defineTool(
  "release_delete",
  "Delete a release entirely.",
  {
    properties: {
      releaseId: {
        description: "The release ID to delete",
        type: "string",
      },
    },
    required: ["releaseId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.releases.deleteRelease, {
      organizationId,
      releaseId: asId<"releases">(params.releaseId, "releaseId"),
    })
);

defineTool(
  "release_link_feedback",
  "Link or unlink a feedback item to/from a release.",
  {
    properties: {
      action: {
        description: "Whether to link or unlink",
        enum: ["link", "unlink"],
        type: "string",
      },
      feedbackId: { description: "The feedback item ID", type: "string" },
      releaseId: { description: "The release ID", type: "string" },
    },
    required: ["releaseId", "feedbackId", "action"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.releases.linkReleaseFeedback, {
      action: requireStr(params.action, "action") as "link" | "unlink",
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
      releaseId: asId<"releases">(params.releaseId, "releaseId"),
    })
);

// ============================================
// MILESTONE TOOLS
// ============================================

defineTool(
  "milestone_list",
  "List milestones with their progress (linked feedback count). Filter by status.",
  {
    properties: {
      status: {
        description: "Filter by milestone status (default: all)",
        enum: ["active", "completed", "archived", "all"],
        type: "string",
      },
    },
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.admin_api.milestones.listMilestones, {
      organizationId,
      status: str(params.status) as
        | "active"
        | "completed"
        | "archived"
        | "all"
        | undefined,
    })
);

defineTool(
  "milestone_get",
  "Get a single milestone with its linked feedback items.",
  {
    properties: {
      milestoneId: { description: "The milestone ID", type: "string" },
    },
    required: ["milestoneId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.admin_api.milestones.getMilestone, {
      milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
      organizationId,
    })
);

defineTool(
  "milestone_create",
  "Create a new milestone for organizing roadmap goals.",
  {
    properties: {
      color: { description: "Milestone color", type: "string" },
      description: { description: "Milestone description", type: "string" },
      emoji: { description: "Emoji icon", type: "string" },
      isPublic: {
        description:
          "Whether the milestone is visible publicly (default: true)",
        type: "boolean",
      },
      name: { description: "Milestone name", type: "string" },
      targetDate: {
        description: "Target date as Unix timestamp in milliseconds",
        type: "number",
      },
      timeHorizon: {
        description: "Time horizon for the milestone",
        enum: [
          "now",
          "next_month",
          "next_quarter",
          "half_year",
          "next_year",
          "future",
        ],
        type: "string",
      },
    },
    required: ["name", "color", "timeHorizon"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.milestones.createMilestone, {
      color: requireStr(params.color, "color"),
      description: str(params.description),
      emoji: str(params.emoji),
      isPublic: bool(params.isPublic),
      name: requireStr(params.name, "name"),
      organizationId,
      targetDate: num(params.targetDate),
      timeHorizon: requireStr(params.timeHorizon, "timeHorizon") as
        | "now"
        | "next_month"
        | "next_quarter"
        | "half_year"
        | "next_year"
        | "future",
    })
);

defineTool(
  "milestone_update",
  "Update a milestone's properties.",
  {
    properties: {
      color: { description: "New color", type: "string" },
      description: { description: "New description", type: "string" },
      emoji: { description: "New emoji", type: "string" },
      isPublic: {
        description: "Whether the milestone is visible publicly",
        type: "boolean",
      },
      milestoneId: { description: "The milestone ID", type: "string" },
      name: { description: "New name", type: "string" },
      targetDate: { description: "New target date", type: "number" },
      timeHorizon: {
        description: "New time horizon",
        enum: [
          "now",
          "next_month",
          "next_quarter",
          "half_year",
          "next_year",
          "future",
        ],
        type: "string",
      },
    },
    required: ["milestoneId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.milestones.updateMilestone, {
      color: str(params.color),
      description: str(params.description),
      emoji: str(params.emoji),
      isPublic: bool(params.isPublic),
      milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
      name: str(params.name),
      organizationId,
      targetDate: num(params.targetDate),
      timeHorizon: str(params.timeHorizon) as
        | "now"
        | "next_month"
        | "next_quarter"
        | "half_year"
        | "next_year"
        | "future"
        | undefined,
    })
);

defineTool(
  "milestone_complete",
  "Mark a milestone as completed.",
  {
    properties: {
      milestoneId: {
        description: "The milestone ID to complete",
        type: "string",
      },
    },
    required: ["milestoneId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.milestones.completeMilestone, {
      milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
      organizationId,
    })
);

defineTool(
  "milestone_delete",
  "Delete a milestone. Linked feedback items will be unlinked.",
  {
    properties: {
      milestoneId: {
        description: "The milestone ID to delete",
        type: "string",
      },
    },
    required: ["milestoneId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.milestones.deleteMilestone, {
      milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
      organizationId,
    })
);

defineTool(
  "milestone_link_feedback",
  "Link or unlink a feedback item to/from a milestone.",
  {
    properties: {
      action: {
        description: "Whether to link or unlink",
        enum: ["link", "unlink"],
        type: "string",
      },
      feedbackId: { description: "The feedback item ID", type: "string" },
      milestoneId: { description: "The milestone ID", type: "string" },
    },
    required: ["milestoneId", "feedbackId", "action"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.milestones.linkMilestoneFeedback, {
      action: requireStr(params.action, "action") as "link" | "unlink",
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
      organizationId,
    })
);

// ============================================
// STATUS TOOLS
// ============================================

defineTool(
  "status_list",
  "List all organization statuses used for roadmap columns (e.g., 'Planned', 'In Progress', 'Done').",
  { properties: {}, type: "object" },
  async (ctx, organizationId) =>
    ctx.runQuery(internal.admin_api.statuses.listStatuses, {
      organizationId,
    })
);

defineTool(
  "status_create",
  "Create a new organization status for the roadmap.",
  {
    properties: {
      color: { description: "Status color (hex or named)", type: "string" },
      icon: { description: "Status icon", type: "string" },
      name: {
        description: "Status name (e.g., 'In Review')",
        type: "string",
      },
    },
    required: ["name", "color"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.statuses.createStatus, {
      color: requireStr(params.color, "color"),
      icon: str(params.icon),
      name: requireStr(params.name, "name"),
      organizationId,
    })
);

defineTool(
  "status_update",
  "Update an organization status's name, color, or icon.",
  {
    properties: {
      color: { description: "New color", type: "string" },
      icon: { description: "New icon", type: "string" },
      name: { description: "New name", type: "string" },
      statusId: { description: "The status ID", type: "string" },
    },
    required: ["statusId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.statuses.updateStatus, {
      color: str(params.color),
      icon: str(params.icon),
      name: str(params.name),
      organizationId,
      statusId: asId<"organizationStatuses">(params.statusId, "statusId"),
    })
);

defineTool(
  "status_delete",
  "Delete an organization status. Feedback using this status will be unset.",
  {
    properties: {
      statusId: {
        description: "The status ID to delete",
        type: "string",
      },
    },
    required: ["statusId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.statuses.deleteStatus, {
      organizationId,
      statusId: asId<"organizationStatuses">(params.statusId, "statusId"),
    })
);

// ============================================
// MEMBER TOOLS
// ============================================

defineTool(
  "member_list",
  "List all members of the organization with their roles.",
  { properties: {}, type: "object" },
  async (ctx, organizationId) =>
    ctx.runQuery(internal.admin_api.members.listMembers, {
      organizationId,
    })
);

defineTool(
  "invitation_create",
  "Invite a new member to the organization by email.",
  {
    properties: {
      email: { description: "Email address to invite", type: "string" },
      role: {
        description: "Role for the new member",
        enum: ["admin", "member"],
        type: "string",
      },
    },
    required: ["email", "role"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.members.createInvitation, {
      email: requireStr(params.email, "email"),
      organizationId,
      role: requireStr(params.role, "role") as "admin" | "member",
    })
);

defineTool(
  "invitation_cancel",
  "Cancel a pending invitation.",
  {
    properties: {
      invitationId: {
        description: "The invitation ID to cancel",
        type: "string",
      },
    },
    required: ["invitationId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.members.cancelInvitation, {
      invitationId: asId<"invitations">(params.invitationId, "invitationId"),
      organizationId,
    })
);

defineTool(
  "invitation_list",
  "List all pending invitations for the organization.",
  { properties: {}, type: "object" },
  async (ctx, organizationId) =>
    ctx.runQuery(internal.admin_api.members.listInvitations, {
      organizationId,
    })
);

// ============================================
// ORGANIZATION TOOLS
// ============================================

defineTool(
  "org_get",
  "Get the organization's information and settings.",
  { properties: {}, type: "object" },
  async (ctx, organizationId) =>
    ctx.runQuery(internal.admin_api.organization.getOrganization, {
      organizationId,
    })
);

defineTool(
  "org_update",
  "Update organization settings like name, visibility, branding, or support.",
  {
    properties: {
      isPublic: {
        description: "Whether the feedback board is publicly accessible",
        type: "boolean",
      },
      name: { description: "Organization name", type: "string" },
      primaryColor: { description: "Brand color (hex)", type: "string" },
      supportEnabled: {
        description: "Whether the support/help desk feature is enabled",
        type: "boolean",
      },
    },
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.organization.updateOrganization, {
      isPublic: bool(params.isPublic),
      name: str(params.name),
      organizationId,
      primaryColor: str(params.primaryColor),
      supportEnabled: bool(params.supportEnabled),
    })
);

defineTool(
  "roadmap_get",
  "Get the public roadmap organized by status columns with feedback items in each.",
  { properties: {}, type: "object" },
  async (ctx, organizationId) =>
    ctx.runQuery(internal.feedback.api_public.getRoadmapByOrganization, {
      organizationId,
    })
);

// ============================================
// PUBLIC EXPORTS
// ============================================

const toolMap = new Map<string, ToolHandler>();
for (const tool of tools) {
  toolMap.set(tool.definition.name, tool.handler);
}

export function getMcpToolDefinitions(): McpToolDefinition[] {
  return tools.map((t) => t.definition);
}

export function executeTool(
  name: string,
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  params: Record<string, unknown>
): Promise<unknown> {
  const handler = toolMap.get(name);
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return handler(ctx, organizationId, params);
}
