"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";
import type { AgentTarget } from "./agent-config";
import { AGENTS, openCloudAgent, openDeepLink } from "./agent-config";
import { buildAgentPrompt, buildProjectContext } from "./agent-prompt";
import {
  AgentsMenuTrigger,
  CodingPromptSection,
  CopyAgentsSection,
  ExternalAgentsSection,
  QueueCommandSection,
} from "./copy-for-agents-sections";
import type { FeedbackTag } from "./feedback-metadata-types";

interface CopyForAgentsProps {
  attachments?: string[];
  description: string | null;
  feedbackId: Id<"feedback">;
  organizationId: Id<"organizations">;
  tags?: Array<FeedbackTag | null>;
  title: string;
}

const COPIED_RESET_MS = 2000;

interface CopyAndMarkInput {
  copiedKey: string;
  markCopied: (id: string) => void;
  message: string;
  text: string;
}

async function copyAndMark({
  copiedKey,
  markCopied,
  message,
  text,
}: CopyAndMarkInput) {
  await navigator.clipboard.writeText(text);
  markCopied(copiedKey);
  toast.success(message);
}

interface AgentActionInput {
  agent: AgentTarget;
  markCopied: (id: string) => void;
  prompt: string;
  repository: string | null;
}

async function runAgentAction({
  agent,
  markCopied,
  prompt,
  repository,
}: AgentActionInput) {
  switch (agent.type) {
    case "copy": {
      await copyAndMark({
        copiedKey: agent.id,
        markCopied,
        message: "Prompt copied to clipboard",
        text: prompt,
      });
      break;
    }
    case "deeplink": {
      await navigator.clipboard.writeText(prompt);
      const opened = openDeepLink(agent.id, prompt);
      toast.success(
        opened
          ? `Opening ${agent.label}… Prompt also copied.`
          : "Prompt copied to clipboard"
      );
      markCopied(agent.id);
      break;
    }
    case "cloud": {
      if (openCloudAgent(agent.id, prompt, repository)) {
        toast.success(`Opening ${agent.label}…`);
      }
      break;
    }
    default:
      break;
  }
}

function useCopiedId() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const markCopied = (id: string) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), COPIED_RESET_MS);
  };
  return { copiedId, markCopied };
}

function useAgentPromptSources({
  attachments,
  description,
  feedbackId,
  organizationId,
  tags,
  title,
}: CopyForAgentsProps) {
  const codingPrompt = useQuery(
    api.feedback.clarification.generateCodingPrompt,
    { feedbackId }
  );
  const feedback = useQuery(api.feedback.queries.get, { id: feedbackId });
  const repoAnalysis = useQuery(
    api.integrations.github.repo_analysis.getLatestAnalysis,
    { organizationId }
  );
  const githubConnection = useQuery(
    api.integrations.github.queries.getConnectionStatus,
    { organizationId }
  );
  const repository = githubConnection?.repositoryFullName ?? null;
  const getPrompt = () =>
    buildAgentPrompt({
      attachments,
      description,
      projectContext: buildProjectContext(repoAnalysis),
      reportContext: feedback?.context,
      tags: (tags ?? []).filter((t): t is FeedbackTag => t !== null),
      title,
    });
  return {
    availableAgents: AGENTS.filter(
      (agent) => agent.id !== "copilot-workspace" || Boolean(repository)
    ),
    codingPrompt: codingPrompt?.prompt,
    getPrompt,
    repository,
  };
}

function useAgentMenu(props: CopyForAgentsProps) {
  const { copiedId, markCopied } = useCopiedId();
  const { availableAgents, codingPrompt, getPrompt, repository } =
    useAgentPromptSources(props);

  const handleAgentAction = (agent: AgentTarget) =>
    runAgentAction({ agent, markCopied, prompt: getPrompt(), repository });

  const handleCopyCodingPrompt = async () => {
    if (!codingPrompt) {
      return;
    }
    await copyAndMark({
      copiedKey: "coding-prompt",
      markCopied,
      message: "Coding prompt copied",
      text: codingPrompt,
    });
  };

  const handleCopyQueueCommand = () =>
    copyAndMark({
      copiedKey: "reflet-cli",
      markCopied,
      message:
        "Command copied. Paste it into an agent set up with `reflet agent install`.",
      text: `/reflet ${props.feedbackId}`,
    });

  return {
    availableAgents,
    copiedId,
    handleAgentAction,
    handleCopyCodingPrompt,
    handleCopyQueueCommand,
    hasCodingPrompt: Boolean(codingPrompt),
  };
}

export function CopyForAgents(props: CopyForAgentsProps) {
  const {
    availableAgents,
    copiedId,
    hasCodingPrompt,
    handleAgentAction,
    handleCopyCodingPrompt,
    handleCopyQueueCommand,
  } = useAgentMenu(props);

  return (
    <DropdownMenu>
      <AgentsMenuTrigger />
      <DropdownMenuContent align="end" className="w-64">
        <QueueCommandSection
          copied={copiedId === "reflet-cli"}
          onCopy={handleCopyQueueCommand}
        />
        <DropdownMenuSeparator />
        <CopyAgentsSection
          agents={availableAgents.filter((a) => a.type === "copy")}
          copiedId={copiedId}
          onAction={handleAgentAction}
        />
        {hasCodingPrompt && (
          <CodingPromptSection
            copied={copiedId === "coding-prompt"}
            onCopy={handleCopyCodingPrompt}
          />
        )}
        <ExternalAgentsSection
          agents={availableAgents.filter((a) => a.type === "deeplink")}
          copiedId={copiedId}
          label="Open in editor"
          onAction={handleAgentAction}
        />
        <ExternalAgentsSection
          agents={availableAgents.filter((a) => a.type === "cloud")}
          copiedId={null}
          label="Cloud agents"
          onAction={handleAgentAction}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
