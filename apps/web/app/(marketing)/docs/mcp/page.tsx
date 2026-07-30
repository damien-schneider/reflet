import type { Metadata } from "next";
import Link from "next/link";

import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Connect AI coding assistants to Reflet via the Model Context Protocol. Manage feedback, releases, milestones and more from Cursor, VS Code, Claude Code and other AI tools.",
  keywords: [
    "mcp",
    "model context protocol",
    "ai",
    "cursor",
    "claude code",
    "vs code copilot",
    "ai integration",
    "feedback automation",
  ],
  path: "/docs/mcp",
  title: "MCP Server",
});

const IDE_CONFIGS = [
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

const TOOLS_REFERENCE = [
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

const EXAMPLE_PROMPTS = [
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

export default function McpDocsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        MCP Server
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        Connect AI coding assistants to your Reflet workspace via the{" "}
        <a
          className="underline underline-offset-4 hover:text-foreground"
          href="https://modelcontextprotocol.io"
          rel="noopener noreferrer"
          target="_blank"
        >
          Model Context Protocol
        </a>
        . Manage feedback, releases, milestones, and more directly from your
        editor.
      </p>

      {/* Prerequisites */}
      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Prerequisites
        </h2>
        <ul className="list-inside list-disc space-y-2 text-muted-foreground text-sm">
          <li>
            A Reflet account with an organization (
            <Link
              className="underline underline-offset-4 hover:text-foreground"
              href="/auth/sign-up"
            >
              sign up
            </Link>
            )
          </li>
          <li>
            An API secret key — generate one in{" "}
            <strong className="text-foreground">Dashboard → In-App</strong>
          </li>
          <li>
            Node.js 18+ (the server runs via <InlineCode>npx</InlineCode>)
          </li>
          <li>A supported IDE: Cursor, VS Code, Claude Code, or Windsurf</li>
        </ul>
      </section>

      {/* Setup */}
      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Setup
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Create the MCP configuration file for your editor. Replace{" "}
          <InlineCode>your-secret-key</InlineCode> with your actual secret key.
        </p>
        <div className="space-y-6">
          {IDE_CONFIGS.map((ide) => (
            <div key={ide.name}>
              <h3 className="mb-1 font-semibold text-foreground text-sm">
                {ide.name}
              </h3>
              <p className="mb-2 text-muted-foreground text-xs">{ide.file}</p>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <pre className="overflow-x-auto text-sm">
                  <code>{ide.config}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-muted-foreground text-sm">
          Restart your IDE after adding the configuration. The Reflet tools will
          appear in your agent&apos;s available tools.
        </p>
      </section>

      {/* Example Prompts */}
      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Example prompts
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Try these prompts in your AI assistant after connecting the MCP
          server. More suggestions are available in your{" "}
          <strong className="text-foreground">Dashboard → AI → Prompts</strong>{" "}
          tab.
        </p>
        <div className="space-y-4">
          {EXAMPLE_PROMPTS.map((example) => (
            <div
              className="rounded-lg border border-border p-4"
              key={example.title}
            >
              <h3 className="mb-1 font-semibold text-foreground text-sm">
                {example.title}
              </h3>
              <p className="font-mono text-muted-foreground text-xs leading-relaxed">
                {example.prompt}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tools Reference */}
      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Tools reference
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          The MCP server exposes 50+ tools organized by domain. Your AI
          assistant will automatically discover and use the right tools.
        </p>
        <div className="space-y-6">
          {TOOLS_REFERENCE.map((group) => (
            <div key={group.category}>
              <h3 className="mb-2 font-semibold text-foreground text-sm">
                {group.category}
              </h3>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <tbody>
                    {group.tools.map((tool, index) => (
                      <tr
                        className={
                          index % 2 === 0 ? "bg-muted/20" : "bg-background"
                        }
                        key={tool.name}
                      >
                        <td className="px-4 py-2">
                          <InlineCode>{tool.name}</InlineCode>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {tool.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Environment Variables */}
      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Environment variables
        </h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Variable</th>
                <th className="px-4 py-2 text-left font-medium">Required</th>
                <th className="px-4 py-2 text-left font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-2">
                  <InlineCode>REFLET_SECRET_KEY</InlineCode>
                </td>
                <td className="px-4 py-2 text-muted-foreground">Yes</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Your API secret key from Dashboard → In-App
                </td>
              </tr>
              <tr className="bg-muted/20">
                <td className="px-4 py-2">
                  <InlineCode>REFLET_BASE_URL</InlineCode>
                </td>
                <td className="px-4 py-2 text-muted-foreground">No</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Override the API base URL (self-hosted only)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Links */}
      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Resources
        </h2>
        <ul className="list-inside list-disc space-y-2 text-muted-foreground text-sm">
          <li>
            <a
              className="underline underline-offset-4 hover:text-foreground"
              href="https://modelcontextprotocol.io"
              rel="noopener noreferrer"
              target="_blank"
            >
              Model Context Protocol specification
            </a>
          </li>
          <li>
            <Link
              className="underline underline-offset-4 hover:text-foreground"
              href="/docs/api"
            >
              REST API documentation
            </Link>
          </li>
          <li>
            <Link
              className="underline underline-offset-4 hover:text-foreground"
              href="/docs/sdk"
            >
              SDK documentation
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
