export const IDE_CONFIGS = [
  {
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
    file: ".cursor/mcp.json",
    name: "Cursor",
  },
  {
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
    file: ".vscode/mcp.json",
    name: "VS Code (Copilot)",
  },
  {
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
    file: ".mcp.json",
    name: "Claude Code",
  },
  {
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
    file: "~/.codeium/windsurf/mcp_config.json",
    name: "Windsurf",
  },
] as const;

export const TOOLS_REFERENCE = [
  {
    category: "Feedback",
    tools: [
      {
        description: "List, search and filter feedback",
        name: "feedback_list",
      },
      { description: "Get a specific feedback item", name: "feedback_get" },
      { description: "Create new feedback", name: "feedback_create" },
      { description: "Update title or description", name: "feedback_update" },
      { description: "Soft-delete feedback", name: "feedback_delete" },
      { description: "Restore deleted feedback", name: "feedback_restore" },
      { description: "Assign to a team member", name: "feedback_assign" },
      { description: "Change status", name: "feedback_set_status" },
      { description: "Add tags", name: "feedback_add_tag" },
      { description: "Remove tags", name: "feedback_remove_tag" },
      { description: "Toggle vote", name: "feedback_vote" },
      {
        description: "Set priority level",
        name: "feedback_set_priority",
      },
      {
        description: "Set complexity estimate",
        name: "feedback_set_complexity",
      },
      { description: "Set a deadline", name: "feedback_set_deadline" },
    ],
  },
  {
    category: "Comments",
    tools: [
      { description: "List comments on feedback", name: "comment_list" },
      { description: "Add a comment", name: "comment_create" },
      { description: "Edit a comment", name: "comment_update" },
      { description: "Delete a comment", name: "comment_delete" },
      {
        description: "Toggle official response",
        name: "comment_mark_official",
      },
    ],
  },
  {
    category: "Releases",
    tools: [
      { description: "List releases with filters", name: "release_list" },
      { description: "Get release details", name: "release_get" },
      { description: "Create a release", name: "release_create" },
      { description: "Update release content", name: "release_update" },
      { description: "Publish a release", name: "release_publish" },
      { description: "Unpublish a release", name: "release_unpublish" },
      { description: "Delete a release", name: "release_delete" },
      {
        description: "Link/unlink feedback",
        name: "release_link_feedback",
      },
    ],
  },
  {
    category: "Milestones",
    tools: [
      { description: "List milestones", name: "milestone_list" },
      { description: "Get milestone details", name: "milestone_get" },
      { description: "Create a milestone", name: "milestone_create" },
      { description: "Update a milestone", name: "milestone_update" },
      { description: "Mark as complete", name: "milestone_complete" },
      { description: "Delete a milestone", name: "milestone_delete" },
      {
        description: "Link/unlink feedback",
        name: "milestone_link_feedback",
      },
    ],
  },
  {
    category: "Tags",
    tools: [
      { description: "List all tags", name: "tag_list" },
      { description: "Create a tag", name: "tag_create" },
      { description: "Update a tag", name: "tag_update" },
      { description: "Delete a tag", name: "tag_delete" },
    ],
  },
  {
    category: "Statuses",
    tools: [
      { description: "List custom statuses", name: "status_list" },
      { description: "Create a status", name: "status_create" },
      { description: "Update a status", name: "status_update" },
      { description: "Delete a status", name: "status_delete" },
    ],
  },
  {
    category: "Team",
    tools: [
      { description: "List team members", name: "member_list" },
      { description: "List open invitations", name: "invitation_list" },
      { description: "Invite a member", name: "invitation_create" },
      { description: "Cancel an invitation", name: "invitation_cancel" },
    ],
  },
  {
    category: "Organization",
    tools: [
      { description: "Get organization details", name: "org_get" },
      { description: "Update organization settings", name: "org_update" },
      {
        description: "Get full roadmap with milestones",
        name: "roadmap_get",
      },
    ],
  },
] as const;

export const EXAMPLE_PROMPTS = [
  {
    prompt:
      "List all feedback sorted by votes. Identify the top 5 most requested features and suggest which ones should be prioritized next.",
    title: "Explore feedback",
  },
  {
    prompt:
      "List feedback with recent comments. For any feedback where the last comment is from a user, draft a helpful reply.",
    title: "Suggest replies",
  },
  {
    prompt:
      "List all tags, then find feedback with no tags. Suggest which tags to apply to each untagged item.",
    title: "Triage and tag",
  },
  {
    prompt:
      "Find feedback marked as completed that is not linked to any release. Create a new release and link the relevant items.",
    title: "Prepare a release",
  },
  {
    prompt:
      'Search feedback for "your-keyword". Understand the issue from the description and comments, then explore the codebase and implement the fix.',
    title: "Implement a fix",
  },
  {
    prompt:
      "List all recent feedback. Summarize: total count, most voted items, status distribution, and any items needing urgent attention.",
    title: "Weekly report",
  },
] as const;
