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

function generateCursorConfig(secretKey: string): string {
  return JSON.stringify(
    {
      mcpServers: {
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

function generateVSCodeConfig(secretKey: string): string {
  return JSON.stringify(
    {
      servers: {
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

function generateClaudeCodeConfig(secretKey: string): string {
  return JSON.stringify(
    {
      mcpServers: {
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

function generateWindsurfConfig(secretKey: string): string {
  return JSON.stringify(
    {
      mcpServers: {
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

interface IdeConfig {
  id: string;
  name: string;
  filePath: string;
  description: string;
  generate: (key: string) => string;
}

const IDE_CONFIGS: IdeConfig[] = [
  {
    id: "cursor",
    name: "Cursor",
    filePath: ".cursor/mcp.json",
    description: "Add to your project root",
    generate: generateCursorConfig,
  },
  {
    id: "vscode",
    name: "VS Code",
    filePath: ".vscode/mcp.json",
    description: "Copilot agent mode",
    generate: generateVSCodeConfig,
  },
  {
    id: "claude-code",
    name: "Claude Code",
    filePath: ".mcp.json",
    description: "Add to your project root",
    generate: generateClaudeCodeConfig,
  },
  {
    id: "windsurf",
    name: "Windsurf",
    filePath: "~/.codeium/windsurf/mcp_config.json",
    description: "Global configuration",
    generate: generateWindsurfConfig,
  },
] as const;

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
  fileName: string;
  label: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
        <code className="text-muted-foreground text-xs">{fileName}</code>
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
          <span className="font-medium text-foreground">Settings → In-App</span>{" "}
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
        <Muted>
          Create the configuration file for your editor. Replace the secret key
          with the one from step 1.
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
                  code={ide.generate(displayKey)}
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
