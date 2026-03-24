"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { H2, Muted, Text } from "@/components/ui/typography";

const MCP_NPM_PACKAGE = "@reflet/mcp-server";
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

type TransportMode = "http" | "stdio";

interface IdeConfig {
  description: string;
  filePath: string | null;
  id: string;
  name: string;
  wrapper: "mcpServers" | "servers";
}

const IDE_CONFIGS: IdeConfig[] = [
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

function generateChatGptConfig(secretKey: string): string {
  return `URL: ${CONVEX_SITE_URL}/mcp\nHeader: Authorization: Bearer ${secretKey}`;
}

function generateConfig(
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

const AVAILABLE_TOOLS = [
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

function CopyButton({ text, label }: { text: string; label: string }) {
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  }, [text, label]);

  return (
    <Button
      className="h-7 w-7"
      onClick={handleCopy}
      size="icon"
      variant="ghost"
    >
      {hasCopied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

function CodeBlock({
  code,
  fileName,
  label,
}: {
  code: string;
  fileName: string | null;
  label: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
        {fileName ? (
          <code className="text-muted-foreground text-xs">{fileName}</code>
        ) : (
          <span />
        )}
        <CopyButton label={label} text={code} />
      </div>
      <pre className="overflow-x-auto p-4 text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}

interface McpSetupGuideProps {
  secretKey?: string;
}

export function McpSetupGuide({ secretKey }: McpSetupGuideProps) {
  const displayKey = secretKey ?? "your-secret-key";
  const [transport, setTransport] = useState<TransportMode>("http");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <H2 variant="card">MCP Server Setup</H2>
        <Text className="mt-1" variant="bodySmall">
          Connect AI coding assistants to your Reflet workspace. Agents can
          read, create and manage feedback, releases, milestones and more.
        </Text>
      </div>

      {/* Step 1: Get Secret Key */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Step 1</Badge>
          <h3 className="font-semibold text-sm">Get your secret key</h3>
        </div>
        <Muted>
          Go to{" "}
          <span className="font-medium text-foreground">
            Settings &rarr; In-App
          </span>{" "}
          and generate an API key. Copy the <strong>secret key</strong> — you
          will need it for the MCP configuration.
        </Muted>
      </section>

      {/* Step 2: Configure IDE */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Step 2</Badge>
          <h3 className="font-semibold text-sm">Add MCP config to your IDE</h3>
        </div>

        {/* Transport mode selector */}
        <div className="flex items-center gap-3">
          <Muted className="shrink-0 text-xs">Transport:</Muted>
          <div className="flex gap-1 rounded-md border p-0.5">
            <button
              className={`rounded px-3 py-1 text-xs transition-colors ${
                transport === "http"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTransport("http")}
              type="button"
            >
              HTTP (Recommended)
            </button>
            <button
              className={`rounded px-3 py-1 text-xs transition-colors ${
                transport === "stdio"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTransport("stdio")}
              type="button"
            >
              Stdio
            </button>
          </div>
        </div>
        <Muted className="text-xs">
          {transport === "http"
            ? "HTTP connects directly to Reflet's server — no local install needed."
            : "Stdio runs a local process via npx. Requires Node.js installed."}
        </Muted>

        <Tabs defaultValue="cursor">
          <TabsList>
            {IDE_CONFIGS.map((ide) => (
              <TabsTrigger key={ide.id} value={ide.id}>
                {ide.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {IDE_CONFIGS.map((ide) => (
            <TabsContent className="mt-3" key={ide.id} value={ide.id}>
              <div className="space-y-2">
                <Muted>{ide.description}</Muted>
                <CodeBlock
                  code={generateConfig(ide, displayKey, transport)}
                  fileName={ide.filePath}
                  label={`${ide.name} config`}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      {/* Step 3: Start using */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Step 3</Badge>
          <h3 className="font-semibold text-sm">Start using</h3>
        </div>
        <Muted>
          Restart your IDE. The Reflet MCP server will appear in your agent's
          available tools. Try asking your AI assistant one of the suggested
          prompts from the <strong>Prompts</strong> tab.
        </Muted>
      </section>

      {/* Available Tools */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm">50+ available tools</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {AVAILABLE_TOOLS.map((group) => (
            <Card key={group.category}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{group.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {group.tools.map((tool) => (
                    <li
                      className="flex items-start gap-2 text-muted-foreground text-xs"
                      key={tool}
                    >
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                      <span>{tool}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
