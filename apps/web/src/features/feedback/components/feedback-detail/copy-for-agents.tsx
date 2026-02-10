"use client";

import {
  ArrowUpRight,
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
  attachments?: string[];
}

interface AgentTarget {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: "copy" | "deeplink" | "cloud";
  description: string;
}

// ============================================
// Image handling
// ============================================

async function fetchImageAsBlob(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return await response.blob();
  } catch (error) {
    console.error("Failed to fetch image:", error);
    return null;
  }
}

async function copyTextAndImages(
  text: string,
  imageUrls: string[]
): Promise<boolean> {
  try {
    // Check if ClipboardItem is supported
    if (!(navigator.clipboard && window.ClipboardItem)) {
      // Fallback to text-only
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fetch all images in parallel
    const imagePromises = imageUrls.map((url) => fetchImageAsBlob(url));
    const imageBlobs = await Promise.all(imagePromises);
    const validBlobs = imageBlobs.filter((blob): blob is Blob => blob !== null);

    // Create clipboard items for text and images
    const clipboardItems: Record<string, Blob> = {
      "text/plain": new Blob([text], { type: "text/plain" }),
    };

    // Add images to clipboard data
    for (const blob of validBlobs) {
      if (blob.type.startsWith("image/")) {
        clipboardItems[blob.type] = blob;
      }
    }

    const item = new ClipboardItem(clipboardItems);
    await navigator.clipboard.write([item]);
    return true;
  } catch (error) {
    console.error("Failed to copy with images:", error);
    // Fallback to text-only
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (fallbackError) {
      console.error("Failed to copy text:", fallbackError);
      return false;
    }
  }
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
    viewBox="0 0 125 143"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Cursor</title>
    <path d="M 60.66 0.00 L 64.42 0.00 C 82.67 10.62 100.99 21.12 119.25 31.72 C 121.24 33.01 123.54 34.18 124.72 36.34 C 125.34 39.17 125.06 42.10 125.11 44.98 C 125.07 63.63 125.08 82.28 125.11 100.93 C 125.07 102.84 125.14 104.79 124.73 106.68 C 123.53 108.54 121.50 109.62 119.68 110.77 C 104.03 119.72 88.45 128.80 72.85 137.83 C 69.53 139.68 66.36 141.91 62.74 143.17 C 60.51 142.85 58.57 141.57 56.62 140.54 C 40.81 131.22 24.82 122.22 9.00 112.92 C 5.85 111.16 2.79 109.23 0.00 106.93 L 0.00 36.10 C 3.83 32.32 8.81 30.12 13.34 27.33 C 29.10 18.19 44.82 8.98 60.66 0.00 M 5.62 38.04 C 8.28 40.64 11.88 41.83 14.96 43.80 C 30.60 53.06 46.50 61.89 62.05 71.30 C 62.86 75.82 62.50 80.43 62.55 85.00 C 62.57 100.64 62.51 116.29 62.54 131.93 C 62.54 133.69 62.72 135.44 63.01 137.17 C 64.18 135.60 65.29 133.98 66.24 132.27 C 83.07 103.08 99.93 73.92 116.65 44.67 C 117.89 42.62 118.84 40.42 119.57 38.14 C 113.41 37.65 107.23 37.91 101.06 37.87 C 73.71 37.85 46.35 37.85 18.99 37.87 C 14.54 38.02 10.07 37.53 5.62 38.04 Z" />
  </svg>
);

const COPILOT_ICON = (
  <svg
    className="h-4 w-4"
    fill="none"
    role="img"
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>VS Code</title>
    <mask
      height="100"
      id="mask0"
      mask-type="alpha"
      maskUnits="userSpaceOnUse"
      width="100"
      x="0"
      y="0"
    >
      <path
        clip-rule="evenodd"
        d="M70.9119 99.3171C72.4869 99.9307 74.2828 99.8914 75.8725 99.1264L96.4608 89.2197C98.6242 88.1787 100 85.9892 100 83.5872V16.4133C100 14.0113 98.6243 11.8218 96.4609 10.7808L75.8725 0.873756C73.7862 -0.130129 71.3446 0.11576 69.5135 1.44695C69.252 1.63711 69.0028 1.84943 68.769 2.08341L29.3551 38.0415L12.1872 25.0096C10.589 23.7965 8.35363 23.8959 6.86933 25.2461L1.36303 30.2549C-0.452552 31.9064 -0.454633 34.7627 1.35853 36.417L16.2471 50.0001L1.35853 63.5832C-0.454633 65.2374 -0.452552 68.0938 1.36303 69.7453L6.86933 74.7541C8.35363 76.1043 10.589 76.2037 12.1872 74.9905L29.3551 61.9587L68.769 97.9167C69.3925 98.5406 70.1246 99.0104 70.9119 99.3171ZM75.0152 27.2989L45.1091 50.0001L75.0152 72.7012V27.2989Z"
        fill="white"
        fill-rule="evenodd"
      />
    </mask>
    <g mask="url(#mask0)">
      <path
        d="M96.4614 10.7962L75.8569 0.875542C73.4719 -0.272773 70.6217 0.211611 68.75 2.08333L1.29858 63.5832C-0.515693 65.2373 -0.513607 68.0937 1.30308 69.7452L6.81272 74.754C8.29793 76.1042 10.5347 76.2036 12.1338 74.9905L93.3609 13.3699C96.086 11.3026 100 13.2462 100 16.6667V16.4275C100 14.0265 98.6246 11.8378 96.4614 10.7962Z"
        fill="#0065A9"
      />
      <path
        d="M96.4614 89.2038L75.8569 99.1245C73.4719 100.273 70.6217 99.7884 68.75 97.9167L1.29858 36.4169C-0.515693 34.7627 -0.513607 31.9063 1.30308 30.2548L6.81272 25.246C8.29793 23.8958 10.5347 23.7964 12.1338 25.0095L93.3609 86.6301C96.086 88.6974 100 86.7538 100 83.3334V83.5726C100 85.9735 98.6246 88.1622 96.4614 89.2038Z"
        fill="#007ACC"
      />
      <path
        d="M75.8578 99.1263C73.4721 100.274 70.6219 99.7885 68.75 97.9166C71.0564 100.223 75 98.5895 75 95.3278V4.67213C75 1.41039 71.0564 -0.223106 68.75 2.08329C70.6219 0.211402 73.4721 -0.273666 75.8578 0.873633L96.4587 10.7807C98.6234 11.8217 100 14.0112 100 16.4132V83.5871C100 85.9891 98.6234 88.1786 96.4586 89.2196L75.8578 99.1263Z"
        fill="#1F9CF0"
      />
    </g>
  </svg>
);

const WINDSURF_ICON = (
  <svg
    className="h-4 w-4"
    fill="currentColor"
    role="img"
    viewBox="0 0 1024 1024"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Windsurf</title>
    <path d="M897.246 286.869H889.819C850.735 286.808 819.017 318.46 819.017 357.539V515.589C819.017 547.15 792.93 572.716 761.882 572.716C743.436 572.716 725.02 563.433 714.093 547.85L552.673 317.304C539.28 298.16 517.486 286.747 493.895 286.747C457.094 286.747 423.976 318.034 423.976 356.657V515.619C423.976 547.181 398.103 572.746 366.842 572.746C348.335 572.746 329.949 563.463 319.021 547.881L138.395 289.882C134.316 284.038 125.154 286.93 125.154 294.052V431.892C125.154 438.862 127.285 445.619 131.272 451.34L309.037 705.2C319.539 720.204 335.033 731.344 352.9 735.392C397.616 745.557 438.77 711.135 438.77 667.278V508.406C438.77 476.845 464.339 451.279 495.904 451.279H495.995C515.02 451.279 532.857 460.562 543.785 476.145L705.235 706.661C718.659 725.835 739.327 737.218 763.983 737.218C801.606 737.218 833.841 705.9 833.841 667.308V508.376C833.841 476.815 859.41 451.249 890.975 451.249H897.276C901.233 451.249 904.43 448.053 904.43 444.097V294.021C904.43 290.065 901.233 286.869 897.276 286.869H897.246Z" />
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
    icon: WINDSURF_ICON,
    type: "deeplink",
    description: "Open Windsurf with this prompt",
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
    });
  }, [title, description, validTags, getProjectContext]);

  const getCopyMessage = useCallback((imageCount: number) => {
    if (imageCount > 0) {
      return `Prompt and ${imageCount} image${imageCount > 1 ? "s" : ""} copied to clipboard`;
    }
    return "Prompt copied to clipboard";
  }, []);

  const handleCopyAction = useCallback(
    async (agentId: string, prompt: string, imageUrls: string[]) => {
      const success = await copyTextAndImages(prompt, imageUrls);
      if (success) {
        setCopiedId(agentId);
        toast.success(getCopyMessage(imageUrls.length));
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        toast.error("Failed to copy to clipboard");
      }
    },
    [getCopyMessage]
  );

  const handleDeeplinkAction = useCallback(
    async (agent: AgentTarget, prompt: string, imageUrls: string[]) => {
      const success = await copyTextAndImages(prompt, imageUrls);
      const opened = openDeepLink(agent.id, prompt);

      if (opened) {
        const message =
          imageUrls.length > 0
            ? `Opening ${agent.label}... Prompt and ${imageUrls.length} image${imageUrls.length > 1 ? "s" : ""} copied.`
            : `Opening ${agent.label}... Prompt also copied.`;
        toast.success(message);
      } else if (success) {
        toast.success("Prompt copied to clipboard");
      } else {
        toast.error("Failed to copy to clipboard");
      }
      setCopiedId(agent.id);
      setTimeout(() => setCopiedId(null), 2000);
    },
    []
  );

  const handleAgentAction = useCallback(
    async (agent: AgentTarget) => {
      const prompt = getPrompt();
      const imageUrls = attachments ?? [];

      switch (agent.type) {
        case "copy": {
          await handleCopyAction(agent.id, prompt, imageUrls);
          break;
        }
        case "deeplink": {
          await handleDeeplinkAction(agent, prompt, imageUrls);
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
    [getPrompt, repository, attachments, handleCopyAction, handleDeeplinkAction]
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
