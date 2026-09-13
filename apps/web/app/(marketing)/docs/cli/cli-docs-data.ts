export const COMMAND_GROUPS = [
  {
    category: "Feedback",
    commands: [
      {
        command: "feedback list [--status open] [--search text] [--limit 20]",
        description: "List, search and filter feedback",
      },
      {
        command: "feedback get <id>",
        description: "One item with its context",
      },
      {
        command: "feedback next [--statuses open,planned] [--tags id,…]",
        description: "Highest-priority unclaimed items",
      },
      {
        command: "feedback claim-next [--as name]",
        description:
          "Claim the next item for two hours and move it to in_progress",
      },
      { command: "feedback claim <id>", description: "Claim a specific item" },
      {
        command: "feedback issue <id>",
        description:
          "Create the GitHub issue for it (needs the GitHub integration)",
      },
      {
        command: "feedback status <id> <status|statusId>",
        description:
          "Change status; closes the linked GitHub issue on completed/closed",
      },
      { command: "feedback comments <id>", description: "Read the thread" },
      {
        command: 'feedback comment <id> --body "…" [--parent id]',
        description: "Reply on the item",
      },
      {
        command: "feedback create --title … --description … [--tag id]",
        description: "File feedback",
      },
      {
        command: "feedback update <id> [--title …] [--description …]",
        description: "Edit title or description",
      },
      {
        command: "feedback assign <id> [memberId]",
        description: "Assign or unassign",
      },
      {
        command: "feedback tags <id> --add a,b --remove c",
        description: "Change tags",
      },
      {
        command:
          "feedback analysis <id> --priority high [--deadline 2026-10-01]",
        description: "Priority, complexity, estimate, deadline",
      },
      {
        command: "feedback delete | restore <id>",
        description: "Soft delete and restore",
      },
    ],
  },
  {
    category: "Comments",
    commands: [
      {
        command: 'comment update <id> --body "…"',
        description: "Edit a comment",
      },
      { command: "comment delete <id>", description: "Delete a comment" },
      {
        command: "comment official <id> true|false",
        description: "Mark as the official reply",
      },
    ],
  },
  {
    category: "Releases",
    commands: [
      {
        command: "release list [--status published]",
        description: "List releases",
      },
      {
        command: "release get <id>",
        description: "Release with its linked feedback",
      },
      {
        command: "release create --title … [--version …]",
        description: "Draft a release",
      },
      {
        command: "release publish | unpublish | delete <id>",
        description: "Lifecycle",
      },
      {
        command: "release link <releaseId> <feedbackId> [unlink]",
        description: "Link feedback",
      },
      {
        command: "release schedule <id> --at 2026-10-01T09:00Z",
        description: "Schedule publishing",
      },
    ],
  },
  {
    category: "Milestones",
    commands: [
      {
        command: "milestone list [--status active]",
        description: "List milestones",
      },
      {
        command: "milestone create --name … --color … --horizon quarter",
        description: "Create",
      },
      { command: "milestone complete | delete <id>", description: "Lifecycle" },
      {
        command: "milestone link <milestoneId> <feedbackId> [unlink]",
        description: "Link feedback",
      },
    ],
  },
  {
    category: "Workspace",
    commands: [
      { command: "tag list | create | update | delete", description: "Tags" },
      {
        command: "status list | create | update | delete",
        description: "Custom statuses",
      },
      { command: "member list", description: "Team members" },
      {
        command:
          "invitation list | create --email … --role member | cancel <id>",
        description: "Invitations",
      },
      {
        command: "org get | update [--name …] [--public true]",
        description: "Organization",
      },
      {
        command:
          "duplicate list | resolve <pairId> confirm | merge <src> <dst>",
        description: "Duplicate pairs",
      },
      {
        command: "screenshot list <feedbackId> | delete <id>",
        description: "Screenshots",
      },
      {
        command: "survey list | get | analytics | responses <id>",
        description: "Surveys",
      },
      {
        command: "roadmap get, changelog list, config get",
        description: "Public views",
      },
    ],
  },
] as const;

export const RECIPES = [
  {
    prompt:
      "Run `npx reflet-cli feedback claim-next --json`, read the item, fix it in this repo, open a PR whose body says `fixes reflet:<id>`, then comment on the feedback with the PR link.",
    title: "Fix the next feedback",
  },
  {
    prompt:
      "Run `npx reflet-cli feedback list --sort votes --limit 20 --json`. Group the items by theme and tell me which three to plan next and why.",
    title: "Explore feedback",
  },
  {
    prompt:
      "For each item in `npx reflet-cli feedback list --status open --json` whose last comment is from a user, draft a reply and post it with `feedback comment`.",
    title: "Suggest replies",
  },
  {
    prompt:
      "Run `npx reflet-cli tag list --json`, then find open feedback with no tags and apply the right ones with `feedback tags <id> --add`.",
    title: "Triage and tag",
  },
  {
    prompt:
      "Find completed feedback not linked to a release, create a release with `release create`, link each item with `release link`, then publish it.",
    title: "Prepare a release",
  },
] as const;
