"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { ArrowSquareOut, Copy, Key, Warning } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import Link from "next/link";
import { AGENT_PROMPT } from "reflet-cli/agent-prompt";
import { CopyBlock } from "@/components/docs/copy-block";
import { InstallCommand } from "@/components/docs/install-command";
import { useAgentApiKey } from "../hooks/use-agent-api-key";

interface AgentsSectionProps {
  organizationId: Id<"organizations">;
}

export function AgentsSection({ organizationId }: AgentsSectionProps) {
  const {
    hasExistingKey,
    newSecretKey,
    isGenerating,
    handleGenerate,
    clearSecretKey,
  } = useAgentApiKey({ organizationId });
  const loginCommand = `npx reflet-cli login --api-key ${newSecretKey ?? "fb_sec_…"}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-semibold text-lg">Agents &amp; CLI</h1>
        <ButtonLink
          render={<Link href="/docs/cli" rel="noopener" target="_blank" />}
          size="xs"
        >
          Docs
          <ArrowSquareOut className="ml-2 h-4 w-4" />
        </ButtonLink>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-medium text-sm">Secret key</h2>
          {hasExistingKey === undefined || newSecretKey ? null : (
            <Button
              disabled={isGenerating}
              onClick={handleGenerate}
              size="xs"
              tone={hasExistingKey ? undefined : "primary"}
              variant={hasExistingKey ? "surface" : "solid"}
            >
              <Key className="mr-2 h-4 w-4" />
              {hasExistingKey ? "Generate new key" : "Generate key"}
            </Button>
          )}
        </div>

        {hasExistingKey === undefined ? (
          <Skeleton className="h-11 w-full rounded-lg" />
        ) : null}

        {newSecretKey ? (
          <div className="rounded-lg border border-warning/30 bg-warning-subtle p-4">
            <div className="flex items-start gap-3">
              <Warning className="mt-0.5 h-5 w-5 text-warning-text" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-warning-text">
                  Save your secret key now
                </p>
                <p className="mt-1 text-warning-text text-xs">
                  This is the only time it will be shown.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="min-w-0 flex-1 overflow-x-auto rounded bg-warning/15 px-3 py-2 font-mono text-sm">
                    {newSecretKey}
                  </code>
                  <Button
                    aria-label="Copy secret key"
                    iconOnly
                    onClick={() => navigator.clipboard.writeText(newSecretKey)}
                    variant="surface"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  className="mt-3"
                  onClick={clearSecretKey}
                  size="xs"
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
        <h2 className="font-medium text-sm">Connect the CLI</h2>
        <p className="text-muted-foreground text-sm">
          Stores the key in <code>~/.reflet/config.json</code>. In CI or a
          sandbox, set <code>REFLET_API_KEY</code> instead.
        </p>
        <InstallCommand command={loginCommand} />
        <InstallCommand command="npx reflet-cli feedback claim-next --json" />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-sm">Agent loop</h2>
        <p className="text-muted-foreground text-sm">
          Paste this into a coding agent running in your repo. Also printed by{" "}
          <code>npx reflet-cli prompt agent</code>.
        </p>
        <CopyBlock content={AGENT_PROMPT} label="Agent prompt" />
      </section>
    </div>
  );
}
