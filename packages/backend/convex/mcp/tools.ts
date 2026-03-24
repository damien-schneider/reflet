import { internal } from "../_generated/api";
import type { Id, TableNames } from "../_generated/dataModel";
import type { httpAction } from "../_generated/server";

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

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function requireStr(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value) {
    throw new Error(`Missing required field: ${fieldName}`);
  }
  return value;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function bool(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function strArr(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.every((v): v is string => typeof v === "string")
    ? value
    : undefined;
}

function asId<T extends TableNames>(value: unknown, fieldName: string): Id<T> {
  if (typeof value !== "string" || !value) {
    throw new Error(`Missing required field: ${fieldName}`);
  }
  return value as Id<T>;
}

function optionalId<T extends TableNames>(value: unknown): Id<T> | undefined {
  return typeof value === "string" && value ? (value as Id<T>) : undefined;
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
    definition: { name, description, inputSchema },
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
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: [
          "open",
          "under_review",
          "planned",
          "in_progress",
          "completed",
          "closed",
        ],
        description: "Filter by feedback status",
      },
      statusId: {
        type: "string",
        description: "Filter by organization status ID",
      },
      tagId: { type: "string", description: "Filter by tag ID" },
      search: {
        type: "string",
        description: "Search in title and description",
      },
      sortBy: {
        type: "string",
        enum: ["votes", "newest", "oldest", "comments"],
        description: "Sort order (default: votes)",
      },
      limit: {
        type: "number",
        description: "Max items to return (default: 50, max: 100)",
      },
      offset: { type: "number", description: "Pagination offset" },
    },
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.feedback.api_public.listFeedbackByOrganization, {
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
      tagId: optionalId<"tags">(params.tagId),
      search: str(params.search),
      sortBy: str(params.sortBy) as
        | "votes"
        | "newest"
        | "oldest"
        | "comments"
        | undefined,
      limit: num(params.limit),
      offset: num(params.offset),
    })
);

defineTool(
  "feedback_get",
  "Get a single feedback item by ID with full details including tags, vote count, and status.",
  {
    type: "object",
    properties: {
      feedbackId: { type: "string", description: "The feedback item ID" },
    },
    required: ["feedbackId"],
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.feedback.api_public.getFeedbackByOrganization, {
      organizationId,
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
    })
);

defineTool(
  "feedback_create",
  "Create a new feedback item (feature request, bug report, etc.).",
  {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Feedback title (max 100 chars)",
      },
      description: {
        type: "string",
        description:
          "Feedback description (rich text or markdown, max 10000 chars)",
      },
      tagId: { type: "string", description: "Tag ID to assign" },
    },
    required: ["title", "description"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.feedback.api_public.createFeedbackByOrganization, {
      organizationId,
      title: requireStr(params.title, "title"),
      description: requireStr(params.description, "description"),
      tagId: optionalId<"tags">(params.tagId),
    })
);

defineTool(
  "feedback_update",
  "Update a feedback item's title or description.",
  {
    type: "object",
    properties: {
      feedbackId: { type: "string", description: "The feedback item ID" },
      title: { type: "string", description: "New title" },
      description: { type: "string", description: "New description" },
    },
    required: ["feedbackId"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateFeedback, {
      organizationId,
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      title: str(params.title),
      description: str(params.description),
    })
);

defineTool(
  "feedback_delete",
  "Soft-delete a feedback item. Can be restored later.",
  {
    type: "object",
    properties: {
      feedbackId: {
        type: "string",
        description: "The feedback item ID to delete",
      },
    },
    required: ["feedbackId"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.deleteFeedback, {
      organizationId,
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
    })
);

defineTool(
  "feedback_restore",
  "Restore a previously deleted feedback item.",
  {
    type: "object",
    properties: {
      feedbackId: {
        type: "string",
        description: "The feedback item ID to restore",
      },
    },
    required: ["feedbackId"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.restoreFeedback, {
      organizationId,
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
    })
);

defineTool(
  "feedback_assign",
  "Assign a feedback item to a team member, or unassign by omitting assigneeId.",
  {
    type: "object",
    properties: {
      feedbackId: { type: "string", description: "The feedback item ID" },
      assigneeId: {
        type: "string",
        description: "User ID of the assignee (omit to unassign)",
      },
    },
    required: ["feedbackId"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.assignFeedback, {
      organizationId,
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      assigneeId: str(params.assigneeId),
    })
);

defineTool(
  "feedback_set_status",
  "Change a feedback item's status on the roadmap. Provide either statusId (organization status) or status (generic status).",
  {
    type: "object",
    properties: {
      feedbackId: { type: "string", description: "The feedback item ID" },
      statusId: {
        type: "string",
        description: "Organization status ID to set",
      },
      status: {
        type: "string",
        enum: [
          "open",
          "under_review",
          "planned",
          "in_progress",
          "completed",
          "closed",
        ],
        description: "Generic status to set",
      },
    },
    required: ["feedbackId"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.setFeedbackStatus, {
      organizationId,
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      statusId: optionalId<"organizationStatuses">(params.statusId),
      status: str(params.status) as
        | "open"
        | "under_review"
        | "planned"
        | "in_progress"
        | "completed"
        | "closed"
        | undefined,
    })
);

defineTool(
  "feedback_add_tag",
  "Add one or more tags to a feedback item.",
  {
    type: "object",
    properties: {
      feedbackId: { type: "string", description: "The feedback item ID" },
      tagIds: {
        type: "array",
        items: { type: "string" },
        description: "Tag IDs to add",
      },
    },
    required: ["feedbackId", "tagIds"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateFeedbackTags, {
      organizationId,
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      addTagIds: strArr(params.tagIds) as Id<"tags">[] | undefined,
    })
);

defineTool(
  "feedback_remove_tag",
  "Remove one or more tags from a feedback item.",
  {
    type: "object",
    properties: {
      feedbackId: { type: "string", description: "The feedback item ID" },
      tagIds: {
        type: "array",
        items: { type: "string" },
        description: "Tag IDs to remove",
      },
    },
    required: ["feedbackId", "tagIds"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateFeedbackTags, {
      organizationId,
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      removeTagIds: strArr(params.tagIds) as Id<"tags">[] | undefined,
    })
);

defineTool(
  "feedback_set_priority",
  "Set the priority level of a feedback item.",
  {
    type: "object",
    properties: {
      feedbackId: { type: "string", description: "The feedback item ID" },
      priority: {
        type: "string",
        enum: ["critical", "high", "medium", "low", "none"],
        description: "Priority level",
      },
    },
    required: ["feedbackId", "priority"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateFeedbackAnalysis, {
      organizationId,
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
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
    type: "object",
    properties: {
      feedbackId: { type: "string", description: "The feedback item ID" },
      complexity: {
        type: "string",
        enum: ["trivial", "simple", "moderate", "complex", "very_complex"],
        description: "Complexity level",
      },
    },
    required: ["feedbackId", "complexity"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateFeedbackAnalysis, {
      organizationId,
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      complexity: requireStr(params.complexity, "complexity") as
        | "trivial"
        | "simple"
        | "moderate"
        | "complex"
        | "very_complex",
    })
);

defineTool(
  "feedback_set_deadline",
  "Set a deadline for a feedback item.",
  {
    type: "object",
    properties: {
      feedbackId: { type: "string", description: "The feedback item ID" },
      deadline: {
        type: "number",
        description: "Deadline as Unix timestamp in milliseconds",
      },
    },
    required: ["feedbackId", "deadline"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateFeedbackAnalysis, {
      organizationId,
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      deadline: num(params.deadline),
    })
);

// ============================================
// COMMENT TOOLS
// ============================================

defineTool(
  "comment_list",
  "List comments on a feedback item. Returns threaded comments with author info.",
  {
    type: "object",
    properties: {
      feedbackId: { type: "string", description: "The feedback item ID" },
      sortBy: {
        type: "string",
        enum: ["newest", "oldest"],
        description: "Sort order (default: oldest)",
      },
    },
    required: ["feedbackId"],
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.feedback.api_public.listCommentsByOrganization, {
      organizationId,
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      sortBy: str(params.sortBy) as "newest" | "oldest" | undefined,
    })
);

defineTool(
  "comment_create",
  "Add a comment to a feedback item. Can be a reply to another comment.",
  {
    type: "object",
    properties: {
      feedbackId: { type: "string", description: "The feedback item ID" },
      body: {
        type: "string",
        description: "Comment text (max 5000 chars)",
      },
      parentId: {
        type: "string",
        description: "Parent comment ID for threaded replies",
      },
    },
    required: ["feedbackId", "body"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.feedback.api_public.addCommentByOrganization, {
      organizationId,
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      body: requireStr(params.body, "body"),
      // Admin comments via MCP don't have an external user - use a placeholder
      // Note: addCommentByOrganization requires externalUserId; for admin
      // comments we need to handle this differently. For now, this tool
      // requires the admin to provide context about the commenter.
      externalUserId: asId<"externalUsers">(
        params.externalUserId,
        "externalUserId"
      ),
      parentId: optionalId<"comments">(params.parentId),
    })
);

defineTool(
  "comment_update",
  "Edit an existing comment's body text.",
  {
    type: "object",
    properties: {
      commentId: { type: "string", description: "The comment ID" },
      body: { type: "string", description: "New comment text" },
    },
    required: ["commentId", "body"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateComment, {
      organizationId,
      commentId: asId<"comments">(params.commentId, "commentId"),
      body: requireStr(params.body, "body"),
    })
);

defineTool(
  "comment_delete",
  "Delete a comment.",
  {
    type: "object",
    properties: {
      commentId: {
        type: "string",
        description: "The comment ID to delete",
      },
    },
    required: ["commentId"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.deleteComment, {
      organizationId,
      commentId: asId<"comments">(params.commentId, "commentId"),
    })
);

defineTool(
  "comment_mark_official",
  "Toggle a comment as an official response from the team.",
  {
    type: "object",
    properties: {
      commentId: { type: "string", description: "The comment ID" },
      isOfficial: {
        type: "boolean",
        description: "Whether the comment is an official response",
      },
    },
    required: ["commentId", "isOfficial"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.markCommentOfficial, {
      organizationId,
      commentId: asId<"comments">(params.commentId, "commentId"),
      isOfficial: params.isOfficial === true,
    })
);

// ============================================
// TAG TOOLS
// ============================================

defineTool(
  "tag_list",
  "List all tags in the organization. Tags are used to categorize feedback items.",
  { type: "object", properties: {} },
  async (ctx, organizationId) =>
    ctx.runQuery(internal.admin_api.tags.listTags, { organizationId })
);

defineTool(
  "tag_create",
  "Create a new tag for categorizing feedback.",
  {
    type: "object",
    properties: {
      name: { type: "string", description: "Tag name" },
      color: {
        type: "string",
        description: "Tag color (e.g., 'blue', 'red', 'green')",
      },
      icon: { type: "string", description: "Emoji icon (e.g., fire, box)" },
      description: { type: "string", description: "Tag description" },
      isPublic: {
        type: "boolean",
        description: "Whether the tag is visible in the public widget",
      },
    },
    required: ["name", "color"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.tags.createTag, {
      organizationId,
      name: requireStr(params.name, "name"),
      color: requireStr(params.color, "color"),
      icon: str(params.icon),
      description: str(params.description),
      isPublic: bool(params.isPublic),
    })
);

defineTool(
  "tag_update",
  "Update an existing tag's properties.",
  {
    type: "object",
    properties: {
      tagId: { type: "string", description: "The tag ID" },
      name: { type: "string", description: "New tag name" },
      color: { type: "string", description: "New tag color" },
      icon: { type: "string", description: "New emoji icon" },
      description: { type: "string", description: "New description" },
      isPublic: {
        type: "boolean",
        description: "Whether the tag is visible in the public widget",
      },
    },
    required: ["tagId"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.tags.updateTag, {
      organizationId,
      tagId: asId<"tags">(params.tagId, "tagId"),
      name: str(params.name),
      color: str(params.color),
      icon: str(params.icon),
      description: str(params.description),
      isPublic: bool(params.isPublic),
    })
);

defineTool(
  "tag_delete",
  "Delete a tag. This will remove the tag from all feedback items.",
  {
    type: "object",
    properties: {
      tagId: { type: "string", description: "The tag ID to delete" },
    },
    required: ["tagId"],
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
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["draft", "published", "all"],
        description: "Filter by publish status (default: all)",
      },
      limit: { type: "number", description: "Max items to return" },
      offset: { type: "number", description: "Pagination offset" },
    },
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.admin_api.releases.listReleases, {
      organizationId,
      status: str(params.status) as "draft" | "published" | "all" | undefined,
      limit: num(params.limit),
      offset: num(params.offset),
    })
);

defineTool(
  "release_get",
  "Get a single release with its linked feedback items.",
  {
    type: "object",
    properties: {
      releaseId: { type: "string", description: "The release ID" },
    },
    required: ["releaseId"],
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
    type: "object",
    properties: {
      title: { type: "string", description: "Release title" },
      description: {
        type: "string",
        description: "Release description/notes (rich text or markdown)",
      },
      version: {
        type: "string",
        description: "Version string (e.g., 'v1.2.0')",
      },
    },
    required: ["title"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.releases.createRelease, {
      organizationId,
      title: requireStr(params.title, "title"),
      description: str(params.description),
      version: str(params.version),
    })
);

defineTool(
  "release_update",
  "Update a release's title, description, or version.",
  {
    type: "object",
    properties: {
      releaseId: { type: "string", description: "The release ID" },
      title: { type: "string", description: "New title" },
      description: {
        type: "string",
        description: "New description/notes",
      },
      version: { type: "string", description: "New version string" },
    },
    required: ["releaseId"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.releases.updateRelease, {
      organizationId,
      releaseId: asId<"releases">(params.releaseId, "releaseId"),
      title: str(params.title),
      description: str(params.description),
      version: str(params.version),
    })
);

defineTool(
  "release_publish",
  "Publish a draft release, making it visible in the public changelog.",
  {
    type: "object",
    properties: {
      releaseId: {
        type: "string",
        description: "The release ID to publish",
      },
    },
    required: ["releaseId"],
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
    type: "object",
    properties: {
      releaseId: {
        type: "string",
        description: "The release ID to unpublish",
      },
    },
    required: ["releaseId"],
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
    type: "object",
    properties: {
      releaseId: {
        type: "string",
        description: "The release ID to delete",
      },
    },
    required: ["releaseId"],
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
    type: "object",
    properties: {
      releaseId: { type: "string", description: "The release ID" },
      feedbackId: { type: "string", description: "The feedback item ID" },
      action: {
        type: "string",
        enum: ["link", "unlink"],
        description: "Whether to link or unlink",
      },
    },
    required: ["releaseId", "feedbackId", "action"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.releases.linkReleaseFeedback, {
      organizationId,
      releaseId: asId<"releases">(params.releaseId, "releaseId"),
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      action: requireStr(params.action, "action") as "link" | "unlink",
    })
);

// ============================================
// MILESTONE TOOLS
// ============================================

defineTool(
  "milestone_list",
  "List milestones with their progress (linked feedback count). Filter by status.",
  {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["active", "completed", "archived", "all"],
        description: "Filter by milestone status (default: all)",
      },
    },
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
    type: "object",
    properties: {
      milestoneId: { type: "string", description: "The milestone ID" },
    },
    required: ["milestoneId"],
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.admin_api.milestones.getMilestone, {
      organizationId,
      milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
    })
);

defineTool(
  "milestone_create",
  "Create a new milestone for organizing roadmap goals.",
  {
    type: "object",
    properties: {
      name: { type: "string", description: "Milestone name" },
      description: { type: "string", description: "Milestone description" },
      emoji: { type: "string", description: "Emoji icon" },
      color: { type: "string", description: "Milestone color" },
      timeHorizon: {
        type: "string",
        enum: [
          "now",
          "next_month",
          "next_quarter",
          "half_year",
          "next_year",
          "future",
        ],
        description: "Time horizon for the milestone",
      },
      targetDate: {
        type: "number",
        description: "Target date as Unix timestamp in milliseconds",
      },
      isPublic: {
        type: "boolean",
        description:
          "Whether the milestone is visible publicly (default: true)",
      },
    },
    required: ["name", "color", "timeHorizon"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.milestones.createMilestone, {
      organizationId,
      name: requireStr(params.name, "name"),
      description: str(params.description),
      emoji: str(params.emoji),
      color: requireStr(params.color, "color"),
      timeHorizon: requireStr(params.timeHorizon, "timeHorizon") as
        | "now"
        | "next_month"
        | "next_quarter"
        | "half_year"
        | "next_year"
        | "future",
      targetDate: num(params.targetDate),
      isPublic: bool(params.isPublic),
    })
);

defineTool(
  "milestone_update",
  "Update a milestone's properties.",
  {
    type: "object",
    properties: {
      milestoneId: { type: "string", description: "The milestone ID" },
      name: { type: "string", description: "New name" },
      description: { type: "string", description: "New description" },
      emoji: { type: "string", description: "New emoji" },
      color: { type: "string", description: "New color" },
      timeHorizon: {
        type: "string",
        enum: [
          "now",
          "next_month",
          "next_quarter",
          "half_year",
          "next_year",
          "future",
        ],
        description: "New time horizon",
      },
      targetDate: { type: "number", description: "New target date" },
      isPublic: {
        type: "boolean",
        description: "Whether the milestone is visible publicly",
      },
    },
    required: ["milestoneId"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.milestones.updateMilestone, {
      organizationId,
      milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
      name: str(params.name),
      description: str(params.description),
      emoji: str(params.emoji),
      color: str(params.color),
      timeHorizon: str(params.timeHorizon) as
        | "now"
        | "next_month"
        | "next_quarter"
        | "half_year"
        | "next_year"
        | "future"
        | undefined,
      targetDate: num(params.targetDate),
      isPublic: bool(params.isPublic),
    })
);

defineTool(
  "milestone_complete",
  "Mark a milestone as completed.",
  {
    type: "object",
    properties: {
      milestoneId: {
        type: "string",
        description: "The milestone ID to complete",
      },
    },
    required: ["milestoneId"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.milestones.completeMilestone, {
      organizationId,
      milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
    })
);

defineTool(
  "milestone_delete",
  "Delete a milestone. Linked feedback items will be unlinked.",
  {
    type: "object",
    properties: {
      milestoneId: {
        type: "string",
        description: "The milestone ID to delete",
      },
    },
    required: ["milestoneId"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.milestones.deleteMilestone, {
      organizationId,
      milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
    })
);

defineTool(
  "milestone_link_feedback",
  "Link or unlink a feedback item to/from a milestone.",
  {
    type: "object",
    properties: {
      milestoneId: { type: "string", description: "The milestone ID" },
      feedbackId: { type: "string", description: "The feedback item ID" },
      action: {
        type: "string",
        enum: ["link", "unlink"],
        description: "Whether to link or unlink",
      },
    },
    required: ["milestoneId", "feedbackId", "action"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.milestones.linkMilestoneFeedback, {
      organizationId,
      milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      action: requireStr(params.action, "action") as "link" | "unlink",
    })
);

// ============================================
// STATUS TOOLS
// ============================================

defineTool(
  "status_list",
  "List all organization statuses used for roadmap columns (e.g., 'Planned', 'In Progress', 'Done').",
  { type: "object", properties: {} },
  async (ctx, organizationId) =>
    ctx.runQuery(internal.admin_api.statuses.listStatuses, {
      organizationId,
    })
);

defineTool(
  "status_create",
  "Create a new organization status for the roadmap.",
  {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Status name (e.g., 'In Review')",
      },
      color: { type: "string", description: "Status color (hex or named)" },
      icon: { type: "string", description: "Status icon" },
    },
    required: ["name", "color"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.statuses.createStatus, {
      organizationId,
      name: requireStr(params.name, "name"),
      color: requireStr(params.color, "color"),
      icon: str(params.icon),
    })
);

defineTool(
  "status_update",
  "Update an organization status's name, color, or icon.",
  {
    type: "object",
    properties: {
      statusId: { type: "string", description: "The status ID" },
      name: { type: "string", description: "New name" },
      color: { type: "string", description: "New color" },
      icon: { type: "string", description: "New icon" },
    },
    required: ["statusId"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.statuses.updateStatus, {
      organizationId,
      statusId: asId<"organizationStatuses">(params.statusId, "statusId"),
      name: str(params.name),
      color: str(params.color),
      icon: str(params.icon),
    })
);

defineTool(
  "status_delete",
  "Delete an organization status. Feedback using this status will be unset.",
  {
    type: "object",
    properties: {
      statusId: {
        type: "string",
        description: "The status ID to delete",
      },
    },
    required: ["statusId"],
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
  { type: "object", properties: {} },
  async (ctx, organizationId) =>
    ctx.runQuery(internal.admin_api.members.listMembers, {
      organizationId,
    })
);

defineTool(
  "invitation_create",
  "Invite a new member to the organization by email.",
  {
    type: "object",
    properties: {
      email: { type: "string", description: "Email address to invite" },
      role: {
        type: "string",
        enum: ["admin", "member"],
        description: "Role for the new member",
      },
    },
    required: ["email", "role"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.members.createInvitation, {
      organizationId,
      email: requireStr(params.email, "email"),
      role: requireStr(params.role, "role") as "admin" | "member",
    })
);

defineTool(
  "invitation_cancel",
  "Cancel a pending invitation.",
  {
    type: "object",
    properties: {
      invitationId: {
        type: "string",
        description: "The invitation ID to cancel",
      },
    },
    required: ["invitationId"],
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.members.cancelInvitation, {
      organizationId,
      invitationId: asId<"invitations">(params.invitationId, "invitationId"),
    })
);

defineTool(
  "invitation_list",
  "List all pending invitations for the organization.",
  { type: "object", properties: {} },
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
  { type: "object", properties: {} },
  async (ctx, organizationId) =>
    ctx.runQuery(internal.admin_api.organization.getOrganization, {
      organizationId,
    })
);

defineTool(
  "org_update",
  "Update organization settings like name, visibility, branding, or support.",
  {
    type: "object",
    properties: {
      name: { type: "string", description: "Organization name" },
      isPublic: {
        type: "boolean",
        description: "Whether the feedback board is publicly accessible",
      },
      primaryColor: { type: "string", description: "Brand color (hex)" },
      supportEnabled: {
        type: "boolean",
        description: "Whether the support/help desk feature is enabled",
      },
    },
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.organization.updateOrganization, {
      organizationId,
      name: str(params.name),
      isPublic: bool(params.isPublic),
      primaryColor: str(params.primaryColor),
      supportEnabled: bool(params.supportEnabled),
    })
);

defineTool(
  "roadmap_get",
  "Get the public roadmap organized by status columns with feedback items in each.",
  { type: "object", properties: {} },
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
