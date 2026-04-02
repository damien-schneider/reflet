"use client";

import { Check, CheckCircle, Key, Warning } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { H2, Muted, Text } from "@/components/ui/typography";
import {
  CodeBlock,
  CopyButton,
} from "@/features/ai-context/components/mcp-code-block";
import type { TransportMode } from "@/features/ai-context/components/mcp-config";
import {
  AVAILABLE_TOOLS,
  generateConfig,
  IDE_CONFIGS,
} from "@/features/ai-context/components/mcp-config";
import { cn } from "@/lib/utils";
import { useMcpApiKey } from "../hooks/use-mcp-api-key";

interface McpSetupGuideProps {
  organizationId: Id<"organizations">;
}

export function McpSetupGuide({ organizationId }: McpSetupGuideProps) {
  const {
    hasExistingKey,
    newSecretKey,
    isGenerating,
    handleGenerate,
    clearSecretKey,
  } = useMcpApiKey({ organizationId });
  const displayKey = newSecretKey ?? "your-secret-key";
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

        {hasExistingKey === undefined && (
          <Skeleton className="h-16 w-full rounded-lg" />
        )}

        {hasExistingKey === false && !newSecretKey && (
          <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
            <div className="rounded-full bg-primary/10 p-2">
              <Key className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <Muted>Generate an API key to connect your IDE to Reflet.</Muted>
              <Button
                className="mt-3"
                disabled={isGenerating}
                onClick={handleGenerate}
                size="sm"
              >
                <Key className="mr-2 h-4 w-4" />
                {isGenerating ? "Generating..." : "Generate API Key"}
              </Button>
            </div>
          </div>
        )}

        {newSecretKey && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
            <div className="flex items-start gap-3">
              <Warning className="mt-0.5 h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <p className="font-medium text-amber-800 text-sm dark:text-amber-200">
                  Save your secret key now
                </p>
                <p className="mt-1 text-amber-700 text-xs dark:text-amber-300">
                  This is the only time you'll see it. The config snippets below
                  are already populated with your key.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="flex-1 rounded bg-amber-100 px-3 py-2 font-mono text-sm dark:bg-amber-900">
                    {newSecretKey}
                  </code>
                  <CopyButton label="Secret key" text={newSecretKey} />
                </div>
                <Button
                  className="mt-3"
                  onClick={clearSecretKey}
                  size="sm"
                  variant="ghost"
                >
                  I've saved my key
                </Button>
              </div>
            </div>
          </div>
        )}

        {hasExistingKey && !newSecretKey && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-4">
            <CheckCircle className="h-5 w-5 text-green-500" weight="fill" />
            <Muted>
              API key configured. Paste your secret key in the config snippets
              below, or{" "}
              <button
                className="font-medium text-foreground underline underline-offset-4"
                onClick={handleGenerate}
                type="button"
              >
                generate a new one
              </button>
              .
            </Muted>
          </div>
        )}
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
              className={cn(
                "rounded px-3 py-1 text-xs transition-colors",
                transport === "http"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTransport("http")}
              type="button"
            >
              HTTP (Recommended)
            </button>
            <button
              className={cn(
                "rounded px-3 py-1 text-xs transition-colors",
                transport === "stdio"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
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
