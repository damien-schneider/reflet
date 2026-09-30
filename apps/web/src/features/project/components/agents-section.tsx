"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { ArrowSquareOut, Key } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import Link from "next/link";
import { AGENT_PROMPT } from "reflet-cli/agent-prompt";
import { CopyBlock } from "@/components/docs/copy-block";
import { InstallCommand } from "@/components/docs/install-command";
import { SecretOnceBanner } from "@/components/secret-once-banner";
import {
  type UseAgentApiKeyReturn,
  useAgentApiKey,
} from "../hooks/use-agent-api-key";
import { SettingsPage, SettingsSection } from "./settings-page";

interface AgentsSectionProps {
  organizationId: Id<"organizations">;
}

export function AgentsSection({ organizationId }: AgentsSectionProps) {
  const agentKey = useAgentApiKey({ organizationId });
  const loginCommand = `npx reflet-cli login --api-key ${agentKey.newSecretKey ?? "fb_sec_…"}`;

  return (
    <SettingsPage
      actions={
        <ButtonLink
          render={<Link href="/docs/cli" rel="noopener" target="_blank" />}
          size="sm"
          variant="surface"
        >
          CLI docs
          <ArrowSquareOut aria-hidden />
        </ButtonLink>
      }
      description="Let coding agents pick up feedback, fix it and report back through the Reflet CLI."
      title="Agents & CLI"
    >
      <SettingsSection title="Secret key">
        <SecretKeyCard agentKey={agentKey} />
      </SettingsSection>

      <SettingsSection title="Set up">
        <ol className="flex flex-col gap-6">
          <SetupStep command={loginCommand} step={1} title="Connect the CLI">
            Stores the key in <code>~/.reflet/config.json</code>. In CI or a
            sandbox, set <code>REFLET_API_KEY</code> instead.
          </SetupStep>
          <SetupStep
            command="npx reflet-cli agent install"
            step={2}
            title="Teach your agent the loop"
          >
            Run this once in the repository. It writes the workflow to{" "}
            <code>.agents/skills/</code> and <code>.claude/skills/</code>, where
            coding agents look for skills. The agent then claims an item, reads
            its screenshots and source locations, fixes it, opens the pull
            request and moves the status, until the queue is empty.
          </SetupStep>
          <SetupStep command="/reflet" step={3} title="Ask for it">
            <code>/reflet</code> in Claude Code, <code>$reflet</code> in Codex,
            or ask any agent to work the Reflet queue. Add a feedback ID to
            scope the run to one item.
          </SetupStep>
        </ol>
      </SettingsSection>

      <SettingsSection
        description={
          <>
            The same workflow as plain text, for agents that don’t read skill
            files. Also printed by <code>npx reflet-cli prompt agent</code>.
          </>
        }
        title="Without the skill"
      >
        <CopyBlock content={AGENT_PROMPT} label="Agent prompt" />
      </SettingsSection>
    </SettingsPage>
  );
}

function SecretKeyCard({ agentKey }: { agentKey: UseAgentApiKeyReturn }) {
  const {
    hasExistingKey,
    newSecretKey,
    isGenerating,
    handleGenerate,
    clearSecretKey,
  } = agentKey;

  if (newSecretKey) {
    return (
      <SecretOnceBanner
        onDismiss={clearSecretKey}
        secret={newSecretKey}
        title="Save your secret key now"
      />
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        {hasExistingKey === undefined ? (
          <Skeleton aria-busy="true" className="h-9 w-full" />
        ) : (
          <>
            <p className="min-w-0 flex-1 basis-64 text-pretty text-body text-muted-foreground">
              {hasExistingKey
                ? "Your organization already has a key. Generate a new one to log in on another machine."
                : "Generate a secret key to connect the CLI to this organization."}
            </p>
            <Button
              disabled={isGenerating}
              onClick={handleGenerate}
              size="sm"
              tone={hasExistingKey ? "neutral" : "primary"}
              variant={hasExistingKey ? "surface" : "solid"}
            >
              {isGenerating ? (
                <Spinner aria-hidden data-icon="inline-start" size="xs" />
              ) : (
                <Key aria-hidden data-icon="inline-start" />
              )}
              {isGenerating ? "Generating…" : "Generate key"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SetupStep({
  children,
  command,
  step,
  title,
}: {
  children: React.ReactNode;
  command: string;
  step: number;
  title: string;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-caption tabular-nums"
      >
        {step}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="text-heading-4">{title}</h3>
        <p className="text-pretty text-body text-muted-foreground">
          {children}
        </p>
        <InstallCommand command={command} />
      </div>
    </li>
  );
}
