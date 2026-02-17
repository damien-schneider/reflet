import { Copy } from "@phosphor-icons/react";
import { toast } from "sonner";

import { COPILOT_ICON, CURSOR_ICON, WINDSURF_ICON } from "./agent-icons";

export interface AgentTarget {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: "copy" | "deeplink" | "cloud";
  description: string;
}

export const AGENTS: AgentTarget[] = [
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

export function openDeepLink(agentId: string, prompt: string): boolean {
  const encodedPrompt = encodeURIComponent(prompt);

  switch (agentId) {
    case "cursor": {
      window.open(
        `cursor://anysphere.cursor-tools/openComposer?prompt=${encodedPrompt}`,
        "_blank"
      );
      return true;
    }
    case "vscode-copilot": {
      window.open(
        `vscode://GitHub.copilot-chat/openChat?prompt=${encodedPrompt}`,
        "_blank"
      );
      return true;
    }
    case "windsurf": {
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

export function openCloudAgent(
  agentId: string,
  prompt: string,
  repository: string | null
): boolean {
  switch (agentId) {
    case "copilot-workspace": {
      if (repository) {
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
