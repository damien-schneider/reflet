"use client";

import {
  ArrowUpRight,
  CaretDown,
  Check,
  Terminal,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AgentTarget } from "./agent-config";
import { AGENTS, openCloudAgent, openDeepLink } from "./agent-config";
import type { FeedbackTag } from "./feedback-metadata-types";

interface CopyForAgentsProps {
  organizationId: Id<"organizations">;
  title: string;
  description: string | null;
  tags?: Array<FeedbackTag | null>;
  attachments?: string[];
}

// ============================================
// Prompt generation
// ============================================

export function buildAgentPrompt({
  title,
  description,
  tags,
  projectContext,
  attachments,
}: {
  title: string;
  description: string | null;
  tags: FeedbackTag[];
  projectContext: string | null;
  attachments?: string[];
}): string {
  const parts: string[] = [];

  parts.push("# User Feedback to Resolve\n");
  parts.push(
    "A user submitted the following feedback. Please analyze and implement the necessary changes.\n"
  );

  // Feedback content
  parts.push("## Feedback\n");
  parts.push(`**Title:** ${title}\n`);
  if (description) {
    parts.push(`**Description:**\n${description}\n`);
  }

  // Tags for context
  if (tags.length > 0) {
    const tagLabels = tags
      .map((t) => `${t.icon ? `${t.icon} ` : ""}${t.name}`)
      .join(", ");
    parts.push(`**Tags:** ${tagLabels}\n`);
  }

  // Project context from repo analysis
  if (projectContext) {
    parts.push("## Project Context\n");
    parts.push(`${projectContext}\n`);
  }

  // Attached screenshots/images
  if (attachments && attachments.length > 0) {
    parts.push("## Attached Screenshots\n");
    for (const url of attachments) {
      parts.push(`- ${url}`);
    }
    parts.push("");
  }

  // Instructions
  parts.push(`## Instructions

1. Analyze the codebase to understand the current implementation
2. Identify the relevant files that need to be modified
3. Implement the changes following the existing code patterns and conventions
4. Ensure the solution is well-tested and follows best practices
5. Keep changes minimal and focused on the specific request`);

  return parts.join("\n");
}

// ============================================
// Component
// ============================================

export function CopyForAgents({
  organizationId,
  title,
  description,
  tags,
  attachments,
}: CopyForAgentsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Get repo analysis for project context (lightweight query)
  const repoAnalysis = useQuery(api.repo_analysis.getLatestAnalysis, {
    organizationId,
  });

  // Get GitHub connection for cloud agents
  const githubConnection = useQuery(api.github.getConnectionStatus, {
    organizationId,
  });

  const validTags = (tags ?? []).filter((t): t is FeedbackTag => t !== null);

  const repository = githubConnection?.repositoryFullName ?? null;

  const getProjectContext = useCallback((): string | null => {
    if (!repoAnalysis?.summary) {
      return null;
    }

    const contextParts: string[] = [];
    if (repoAnalysis.summary) {
      contextParts.push(`**Project:** ${repoAnalysis.summary}`);
    }
    if (repoAnalysis.techStack) {
      contextParts.push(`**Tech Stack:** ${repoAnalysis.techStack}`);
    }
    if (repoAnalysis.architecture) {
      contextParts.push(`**Architecture:** ${repoAnalysis.architecture}`);
    }
    return contextParts.join("\n");
  }, [repoAnalysis]);

  const getPrompt = useCallback((): string => {
    return buildAgentPrompt({
      title,
      description,
      tags: validTags,
      projectContext: getProjectContext(),
      attachments,
    });
  }, [title, description, validTags, getProjectContext, attachments]);

  const handleAgentAction = useCallback(
    async (agent: AgentTarget) => {
      const prompt = getPrompt();

      switch (agent.type) {
        case "copy": {
          await navigator.clipboard.writeText(prompt);
          setCopiedId(agent.id);
          toast.success("Prompt copied to clipboard");
          setTimeout(() => setCopiedId(null), 2000);
          break;
        }
        case "deeplink": {
          // Copy first as fallback, then try deep link
          await navigator.clipboard.writeText(prompt);
          const opened = openDeepLink(agent.id, prompt);
          if (opened) {
            toast.success(`Opening ${agent.label}... Prompt also copied.`);
          } else {
            toast.success("Prompt copied to clipboard");
          }
          setCopiedId(agent.id);
          setTimeout(() => setCopiedId(null), 2000);
          break;
        }
        case "cloud": {
          const opened = openCloudAgent(agent.id, prompt, repository);
          if (opened) {
            toast.success(`Opening ${agent.label}...`);
          }
          break;
        }
        default:
          break;
      }
    },
    [getPrompt, repository]
  );

  // Filter cloud agents that need GitHub
  const availableAgents = AGENTS.filter((agent) => {
    if (agent.id === "copilot-workspace" && !repository) {
      return false;
    }
    return true;
  });

  const copyAgents = availableAgents.filter((a) => a.type === "copy");
  const deeplinkAgents = availableAgents.filter((a) => a.type === "deeplink");
  const cloudAgents = availableAgents.filter((a) => a.type === "cloud");

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <DropdownMenuTrigger
            render={
              <Button
                className="h-8 gap-1.5 px-2.5"
                size="sm"
                variant="outline"
              >
                <Terminal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Agents</span>
                <CaretDown className="h-3 w-3 opacity-50" />
              </Button>
            }
          />
        </TooltipTrigger>
        <TooltipContent>Copy prompt for AI coding agents</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Copy for agents</DropdownMenuLabel>
          {copyAgents.map((agent) => (
            <DropdownMenuItem
              key={agent.id}
              onClick={() => handleAgentAction(agent)}
            >
              <span className="mr-2 flex h-4 w-4 items-center justify-center">
                {copiedId === agent.id ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  agent.icon
                )}
              </span>
              <div className="flex flex-col">
                <span>{agent.label}</span>
                <span className="text-muted-foreground text-xs">
                  {agent.description}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        {deeplinkAgents.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs">
                Open in editor
              </DropdownMenuLabel>
              {deeplinkAgents.map((agent) => (
                <DropdownMenuItem
                  key={agent.id}
                  onClick={() => handleAgentAction(agent)}
                >
                  <span className="mr-2 flex h-4 w-4 items-center justify-center">
                    {copiedId === agent.id ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      agent.icon
                    )}
                  </span>
                  <div className="flex flex-1 flex-col">
                    <span>{agent.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {agent.description}
                    </span>
                  </div>
                  <ArrowUpRight className="h-3 w-3 opacity-50" />
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}

        {cloudAgents.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs">
                Cloud agents
              </DropdownMenuLabel>
              {cloudAgents.map((agent) => (
                <DropdownMenuItem
                  key={agent.id}
                  onClick={() => handleAgentAction(agent)}
                >
                  <span className="mr-2 flex h-4 w-4 items-center justify-center">
                    {agent.icon}
                  </span>
                  <div className="flex flex-1 flex-col">
                    <span>{agent.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {agent.description}
                    </span>
                  </div>
                  <ArrowUpRight className="h-3 w-3 opacity-50" />
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
