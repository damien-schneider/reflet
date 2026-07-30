import { Copy } from "@phosphor-icons/react";
import { toast } from "sonner";

import { COPILOT_ICON, CURSOR_ICON, WINDSURF_ICON } from "./agent-icons";

export interface AgentTarget {
  description: string;
  icon: React.ReactNode;
  id: string;
  label: string;
  type: "copy" | "deeplink" | "cloud";
}

export const AGENTS: AgentTarget[] = [
  {
    description: "Copy to clipboard for any AI assistant",
    icon: <Copy className="h-4 w-4" />,
    id: "copy-generic",
    label: "Copy prompt",
    type: "copy",
  },
  {
    description: "Open Cursor Composer with this prompt",
    icon: CURSOR_ICON,
    id: "cursor",
    label: "Open in Cursor",
    type: "deeplink",
  },
  {
    description: "Open GitHub Copilot Chat in VS Code",
    icon: COPILOT_ICON,
    id: "vscode-copilot",
    label: "Open in VS Code Copilot",
    type: "deeplink",
  },
  {
    description: "Open Windsurf with this prompt",
    icon: WINDSURF_ICON,
    id: "windsurf",
    label: "Open in Windsurf",
    type: "deeplink",
  },
  {
    description: "Open in GitHub Copilot Workspace (cloud)",
    icon: COPILOT_ICON,
    id: "copilot-workspace",
    label: "Copilot Workspace",
    type: "cloud",
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
