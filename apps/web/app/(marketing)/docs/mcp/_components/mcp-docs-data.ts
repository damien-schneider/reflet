export const IDE_CONFIGS = [
  {
    name: "Cursor",
    file: ".cursor/mcp.json",
    config: `{
  "mcpServers": {
    "reflet": {
      "command": "npx",
      "args": ["-y", "@reflet/mcp-server"],
      "env": {
        "REFLET_SECRET_KEY": "your-secret-key"
      }
    }
  }
}`,
  },
  {
    name: "VS Code (Copilot)",
    file: ".vscode/mcp.json",
    config: `{
  "servers": {
    "reflet": {
      "command": "npx",
      "args": ["-y", "@reflet/mcp-server"],
      "env": {
        "REFLET_SECRET_KEY": "your-secret-key"
      }
    }
  }
}`,
  },
  {
    name: "Claude Code",
    file: ".mcp.json",
    config: `{
  "mcpServers": {
    "reflet": {
      "command": "npx",
      "args": ["-y", "@reflet/mcp-server"],
      "env": {
        "REFLET_SECRET_KEY": "your-secret-key"
      }
    }
  }
}`,
  },
  {
    name: "Windsurf",
    file: "~/.codeium/windsurf/mcp_config.json",
    config: `{
  "mcpServers": {
    "reflet": {
      "command": "npx",
      "args": ["-y", "@reflet/mcp-server"],
      "env": {
        "REFLET_SECRET_KEY": "your-secret-key"
      }
    }
  }
}`,
  },
] as const;

export const TOOLS_REFERENCE = [
  {
    category: "Feedback",
    tools: [
      {
        name: "feedback_list",
        description: "List, search and filter feedback",
      },
      { name: "feedback_get", description: "Get a specific feedback item" },
      { name: "feedback_create", description: "Create new feedback" },
      { name: "feedback_update", description: "Update title or description" },
      { name: "feedback_delete", description: "Soft-delete feedback" },
      { name: "feedback_restore", description: "Restore deleted feedback" },
      { name: "feedback_assign", description: "Assign to a team member" },
      { name: "feedback_set_status", description: "Change status" },
      { name: "feedback_add_tag", description: "Add tags" },
      { name: "feedback_remove_tag", description: "Remove tags" },
      { name: "feedback_vote", description: "Toggle vote" },
      {
        name: "feedback_set_priority",
        description: "Set priority level",
      },
      {
        name: "feedback_set_complexity",
        description: "Set complexity estimate",
      },
      { name: "feedback_set_deadline", description: "Set a deadline" },
    ],
  },
  {
    category: "Comments",
    tools: [
      { name: "comment_list", description: "List comments on feedback" },
      { name: "comment_create", description: "Add a comment" },
      { name: "comment_update", description: "Edit a comment" },
      { name: "comment_delete", description: "Delete a comment" },
      {
        name: "comment_mark_official",
        description: "Toggle official response",
      },
    ],
  },
  {
    category: "Releases",
    tools: [
      { name: "release_list", description: "List releases with filters" },
      { name: "release_get", description: "Get release details" },
      { name: "release_create", description: "Create a release" },
      { name: "release_update", description: "Update release content" },
      { name: "release_publish", description: "Publish a release" },
      { name: "release_unpublish", description: "Unpublish a release" },
      { name: "release_delete", description: "Delete a release" },
      {
        name: "release_link_feedback",
        description: "Link/unlink feedback",
      },
    ],
  },
  {
    category: "Milestones",
    tools: [
      { name: "milestone_list", description: "List milestones" },
      { name: "milestone_get", description: "Get milestone details" },
      { name: "milestone_create", description: "Create a milestone" },
      { name: "milestone_update", description: "Update a milestone" },
      { name: "milestone_complete", description: "Mark as complete" },
      { name: "milestone_delete", description: "Delete a milestone" },
      {
        name: "milestone_link_feedback",
        description: "Link/unlink feedback",
      },
    ],
  },
  {
    category: "Tags",
    tools: [
      { name: "tag_list", description: "List all tags" },
      { name: "tag_create", description: "Create a tag" },
      { name: "tag_update", description: "Update a tag" },
      { name: "tag_delete", description: "Delete a tag" },
    ],
  },
  {
    category: "Statuses",
    tools: [
      { name: "status_list", description: "List custom statuses" },
      { name: "status_create", description: "Create a status" },
      { name: "status_update", description: "Update a status" },
      { name: "status_delete", description: "Delete a status" },
    ],
  },
  {
    category: "Team",
    tools: [
      { name: "member_list", description: "List team members" },
      { name: "invitation_list", description: "List open invitations" },
      { name: "invitation_create", description: "Invite a member" },
      { name: "invitation_cancel", description: "Cancel an invitation" },
    ],
  },
  {
    category: "Organization",
    tools: [
      { name: "org_get", description: "Get organization details" },
      { name: "org_update", description: "Update organization settings" },
      {
        name: "roadmap_get",
        description: "Get full roadmap with milestones",
      },
    ],
  },
] as const;

export const EXAMPLE_PROMPTS = [
  {
    title: "Explore feedback",
    prompt:
      "List all feedback sorted by votes. Identify the top 5 most requested features and suggest which ones should be prioritized next.",
  },
  {
    title: "Suggest replies",
    prompt:
      "List feedback with recent comments. For any feedback where the last comment is from a user, draft a helpful reply.",
  },
  {
    title: "Triage and tag",
    prompt:
      "List all tags, then find feedback with no tags. Suggest which tags to apply to each untagged item.",
  },
  {
    title: "Prepare a release",
    prompt:
      "Find feedback marked as completed that is not linked to any release. Create a new release and link the relevant items.",
  },
  {
    title: "Implement a fix",
    prompt:
      'Search feedback for "your-keyword". Understand the issue from the description and comments, then explore the codebase and implement the fix.',
  },
  {
    title: "Weekly report",
    prompt:
      "List all recent feedback. Summarize: total count, most voted items, status distribution, and any items needing urgent attention.",
  },
] as const;
