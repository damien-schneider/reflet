"use client";

export const MCP_NPM_PACKAGE = "@reflet/mcp-server";
const CONVEX_SITE_URL =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
  "https://your-deployment.convex.site";

function generateStdioConfig(
  wrapper: "mcpServers" | "servers",
  secretKey: string
): string {
  return JSON.stringify(
    {
      [wrapper]: {
        reflet: {
          args: ["-y", MCP_NPM_PACKAGE],
          command: "npx",
          env: {
            REFLET_SECRET_KEY: secretKey,
          },
        },
      },
    },
    null,
    2
  );
}

function generateHttpConfig(
  wrapper: "mcpServers" | "servers",
  secretKey: string
): string {
  return JSON.stringify(
    {
      [wrapper]: {
        reflet: {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
          type: "http",
          url: `${CONVEX_SITE_URL}/mcp`,
        },
      },
    },
    null,
    2
  );
}

type TransportMode = "http" | "stdio";

interface IdeConfig {
  description: string;
  filePath: string | null;
  id: string;
  name: string;
  wrapper: "mcpServers" | "servers";
}

export const IDE_CONFIGS: IdeConfig[] = [
  {
    description: "Add to your project root",
    filePath: ".cursor/mcp.json",
    id: "cursor",
    name: "Cursor",
    wrapper: "mcpServers",
  },
  {
    description: "Copilot agent mode",
    filePath: ".vscode/mcp.json",
    id: "vscode",
    name: "VS Code",
    wrapper: "servers",
  },
  {
    description:
      "Go to Settings > Developer > Edit Config, then paste the configuration below.",
    filePath: null,
    id: "claude-desktop",
    name: "Claude Desktop",
    wrapper: "mcpServers",
  },
  {
    description: "Add to your project root",
    filePath: ".mcp.json",
    id: "claude-code",
    name: "Claude Code",
    wrapper: "mcpServers",
  },
  {
    description: "Global configuration",
    filePath: "~/.codeium/windsurf/mcp_config.json",
    id: "windsurf",
    name: "Windsurf",
    wrapper: "mcpServers",
  },
  {
    description:
      "In ChatGPT, go to Settings > Connected MCP Servers > Add. Paste the URL and API key.",
    filePath: null,
    id: "chatgpt",
    name: "ChatGPT",
    wrapper: "mcpServers",
  },
] as const;

function generateChatGptConfig(secretKey: string): string {
  return `URL: ${CONVEX_SITE_URL}/mcp\nHeader: Authorization: Bearer ${secretKey}`;
}

export function generateConfig(
  ide: IdeConfig,
  secretKey: string,
  transport: TransportMode
): string {
  if (ide.id === "chatgpt") {
    return generateChatGptConfig(secretKey);
  }
  if (transport === "http") {
    return generateHttpConfig(ide.wrapper, secretKey);
  }
  return generateStdioConfig(ide.wrapper, secretKey);
}

export const AVAILABLE_TOOLS = [
  {
    category: "Feedback",
    tools: [
      "List, search and filter feedback",
      "Create, update and delete feedback",
      "Set status, priority & complexity",
      "Assign to team members",
      "Manage tags and votes",
    ],
  },
  {
    category: "Changelog",
    tools: [
      "Create and manage releases",
      "Publish and unpublish entries",
      "Link feedback to releases",
    ],
  },
  {
    category: "Roadmap",
    tools: [
      "Create and manage milestones",
      "Link feedback to milestones",
      "Mark milestones complete",
    ],
  },
  {
    category: "Team",
    tools: [
      "List members and invitations",
      "Invite new team members",
      "View organization details",
    ],
  },
] as const;
