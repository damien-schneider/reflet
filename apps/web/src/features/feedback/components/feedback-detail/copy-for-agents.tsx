"use client";

import {
  ArrowSquareOut,
  CaretDown,
  Check,
  Copy,
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

import type { FeedbackTag } from "./feedback-metadata-types";

// ============================================
// Types
// ============================================

interface CopyForAgentsProps {
  organizationId: Id<"organizations">;
  title: string;
  description: string | null;
  tags?: Array<FeedbackTag | null>;
}

interface AgentTarget {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: "copy" | "deeplink" | "cloud";
  description: string;
}

// ============================================
// Prompt generation
// ============================================

function buildAgentPrompt({
  title,
  description,
  tags,
  projectContext,
}: {
  title: string;
  description: string | null;
  tags: FeedbackTag[];
  projectContext: string | null;
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
// Agent definitions
// ============================================

const CURSOR_ICON = (
  <svg
    className="h-4 w-4"
    fill="currentColor"
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Cursor</title>
    <path d="M3 3l18 9-18 9V3z" />
  </svg>
);

const CLAUDE_ICON = (
  <svg
    className="h-4 w-4"
    fill="currentColor"
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Claude</title>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
  </svg>
);

const COPILOT_ICON = (
  <svg
    className="h-4 w-4"
    fill="currentColor"
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Copilot</title>
    <path d="M12 2C6.48 2 2 5.37 2 9.5c0 2.47 1.55 4.64 3.9 5.95L5 22l4.2-2.8c.92.2 1.85.3 2.8.3 5.52 0 10-3.37 10-7.5S17.52 2 12 2z" />
  </svg>
);

const AGENTS: AgentTarget[] = [
  {
    id: "copy-generic",
    label: "Copy prompt",
    icon: <Copy className="h-4 w-4" />,
    type: "copy",
    description: "Copy to clipboard for any AI assistant",
  },
  {
    id: "cursor",
    label: "Open in Cursor",
    icon: CURSOR_ICON,
    type: "deeplink",
    description: "Open Cursor Composer with this prompt",
  },
  {
    id: "vscode-copilot",
    label: "Open in VS Code Copilot",
    icon: COPILOT_ICON,
    type: "deeplink",
    description: "Open GitHub Copilot Chat in VS Code",
  },
  {
    id: "windsurf",
    label: "Open in Windsurf",
    icon: <Terminal className="h-4 w-4" />,
    type: "deeplink",
    description: "Open Windsurf with this prompt",
  },
  {
    id: "claude-code",
    label: "Copy for Claude Code",
    icon: CLAUDE_ICON,
    type: "copy",
    description: "Copy prompt optimized for Claude Code CLI",
  },
  {
    id: "copilot-workspace",
    label: "Copilot Workspace",
    icon: COPILOT_ICON,
    type: "cloud",
    description: "Open in GitHub Copilot Workspace (cloud)",
  },
];

// ============================================
// Deep link helpers
// ============================================

function openDeepLink(agentId: string, prompt: string): boolean {
  const encodedPrompt = encodeURIComponent(prompt);

  switch (agentId) {
    case "cursor": {
      // Cursor Composer deep link
      window.open(
        `cursor://anysphere.cursor-tools/openComposer?prompt=${encodedPrompt}`,
        "_blank"
      );
      return true;
    }
    case "vscode-copilot": {
      // VS Code GitHub Copilot Chat deep link
      window.open(
        `vscode://GitHub.copilot-chat/openChat?prompt=${encodedPrompt}`,
        "_blank"
      );
      return true;
    }
    case "windsurf": {
      // Windsurf deep link (Codeium)
      window.open(
        `windsurf://codeium.windsurf/openChat?prompt=${encodedPrompt}`,
        "_blank"
      );
      return true;
    }
    default:
      return false;
  }
}

function openCloudAgent(
  agentId: string,
  prompt: string,
  repository: string | null
): boolean {
  switch (agentId) {
    case "copilot-workspace": {
      if (repository) {
        // GitHub Copilot Workspace task URL
        const encodedTask = encodeURIComponent(prompt.slice(0, 500));
        window.open(
          `https://copilot-workspace.githubnext.com/${repository}?task=${encodedTask}`,
          "_blank",
          "noopener"
        );
        return true;
      }
      toast.error("Connect a GitHub repository to use Copilot Workspace");
      return false;
    }
    default:
      return false;
  }
}

// ============================================
// Component
// ============================================

export function CopyForAgents({
  organizationId,
  title,
  description,
  tags,
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
    });
  }, [title, description, validTags, getProjectContext]);

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
        <DropdownMenuLabel>Copy for agents</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Copy options */}
        <DropdownMenuGroup>
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
            <DropdownMenuLabel className="text-xs">
              Open in editor
            </DropdownMenuLabel>
            <DropdownMenuGroup>
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
                  <ArrowSquareOut className="h-3 w-3 opacity-50" />
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}

        {cloudAgents.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">
              Cloud agents
            </DropdownMenuLabel>
            <DropdownMenuGroup>
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
                  <ArrowSquareOut className="h-3 w-3 opacity-50" />
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
