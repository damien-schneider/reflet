"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  Buildings,
  CreditCard,
  GithubLogo,
  Robot,
  Users,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

export type ProjectTab =
  | "github"
  | "ai-mcp"
  | "general"
  | "members"
  | "billing";

interface NavItem {
  description: string;
  icon: Icon;
  id: ProjectTab;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "github",
    label: "GitHub",
    description: "Repository and sync",
    icon: GithubLogo,
  },
  {
    id: "ai-mcp",
    label: "AI & MCP",
    description: "Assistant and integrations",
    icon: Robot,
  },
  {
    id: "general",
    label: "Organization",
    description: "Name, branding, and visibility",
    icon: Buildings,
  },
  {
    id: "members",
    label: "Members",
    description: "Invite and manage team",
    icon: Users,
  },
  {
    id: "billing",
    label: "Billing",
    description: "Subscription and payments",
    icon: CreditCard,
  },
];

interface ProjectNavProps {
  activeTab: ProjectTab;
  onTabChange: (tab: ProjectTab) => void;
}

export function ProjectNav({ activeTab, onTabChange }: ProjectNavProps) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ id, label, description, icon: Icon }) => (
        <button
          className={cn(
            "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
            activeTab === id
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
          )}
          key={id}
          onClick={() => onTabChange(id)}
          type="button"
        >
          <Icon className="size-4 shrink-0" />
          <div className="flex flex-col">
            <span className="font-medium">{label}</span>
            <span className="hidden text-muted-foreground text-xs md:block">
              {description}
            </span>
          </div>
        </button>
      ))}
    </nav>
  );
}
