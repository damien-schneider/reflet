const MCP_NPM_PACKAGE = "@reflet/mcp-server";
const CONVEX_SITE_URL =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
  "https://your-deployment.convex.site";

export type TransportMode = "http" | "stdio";

export interface IdeConfig {
  description: string;
  filePath: string | null;
  id: string;
  name: string;
  wrapper: "mcpServers" | "servers";
}

export const IDE_CONFIGS: IdeConfig[] = [
  {
    id: "cursor",
    name: "Cursor",
    filePath: ".cursor/mcp.json",
    description: "Add to your project root",
    wrapper: "mcpServers",
  },
  {
    id: "vscode",
    name: "VS Code",
    filePath: ".vscode/mcp.json",
    description: "Copilot agent mode",
    wrapper: "servers",
  },
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    filePath: null,
    description:
      "Go to Settings > Developer > Edit Config, then paste the configuration below.",
    wrapper: "mcpServers",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    filePath: ".mcp.json",
    description: "Add to your project root",
    wrapper: "mcpServers",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    filePath: "~/.codeium/windsurf/mcp_config.json",
    description: "Global configuration",
    wrapper: "mcpServers",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    filePath: null,
    description:
      "In ChatGPT, go to Settings > Connected MCP Servers > Add. Paste the URL and API key.",
    wrapper: "mcpServers",
  },
] as const;

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

function generateStdioConfig(
  wrapper: "mcpServers" | "servers",
  secretKey: string
): string {
  return JSON.stringify(
    {
      [wrapper]: {
        reflet: {
          command: "npx",
          args: ["-y", MCP_NPM_PACKAGE],
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
          type: "http",
          url: `${CONVEX_SITE_URL}/mcp`,
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        },
      },
    },
    null,
    2
  );
}

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
