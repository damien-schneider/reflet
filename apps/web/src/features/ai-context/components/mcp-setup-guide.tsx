"use client";

import {
  ArrowSquareOut,
  Check,
  Copy,
  Key,
  Warning,
} from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMcpApiKey } from "../hooks/use-mcp-api-key";
import { generateConfig, IDE_CONFIGS } from "./mcp-configs";

type TransportMode = "http" | "stdio";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <Button
      aria-label={`Copy ${label.toLowerCase()}`}
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-semibold text-lg">AI &amp; MCP</h1>
        <Link
          className="inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
          href="/docs/mcp"
          rel="noopener"
          target="_blank"
        >
          Docs
          <ArrowSquareOut className="h-4 w-4" />
        </Link>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-medium text-sm">API key</h2>
          {hasExistingKey === false && !newSecretKey ? (
            <Button disabled={isGenerating} onClick={handleGenerate} size="sm">
              <Key className="mr-2 h-4 w-4" />
              {isGenerating ? "Generating..." : "Generate key"}
            </Button>
          ) : null}
          {hasExistingKey && !newSecretKey ? (
            <Button
              disabled={isGenerating}
              onClick={handleGenerate}
              size="sm"
              variant="outline"
            >
              {isGenerating ? "Generating..." : "Generate new key"}
            </Button>
          ) : null}
        </div>

        {hasExistingKey === undefined ? (
          <Skeleton className="h-11 w-full rounded-lg" />
        ) : null}

        {newSecretKey ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
            <div className="flex items-start gap-3">
              <Warning className="mt-0.5 h-5 w-5 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-amber-800 text-sm dark:text-amber-200">
                  Save your secret key now
                </p>
                <p className="mt-1 text-amber-700 text-xs dark:text-amber-300">
                  This is the only time it will be shown.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="min-w-0 flex-1 overflow-x-auto rounded bg-amber-100 px-3 py-2 font-mono text-sm dark:bg-amber-900">
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
                  I&apos;ve saved it
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium text-sm">Configuration</h2>
          <div className="flex gap-1 rounded-md border p-0.5">
            <button
              aria-pressed={transport === "http"}
              className={`rounded px-3 py-1 text-xs transition-colors ${
                transport === "http"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTransport("http")}
              type="button"
            >
              HTTP
            </button>
            <button
              aria-pressed={transport === "stdio"}
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
              <CodeBlock
                code={generateConfig(ide, displayKey, transport)}
                fileName={ide.filePath}
                label={`${ide.name} config`}
              />
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </div>
  );
}
