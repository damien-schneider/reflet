"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  Buildings,
  CreditCard,
  GithubLogo,
  Globe,
  Robot,
  Users,
} from "@phosphor-icons/react";
import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type ProjectTab =
  | "github"
  | "ai-mcp"
  | "general"
  | "domains"
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
    id: "domains",
    label: "Domains",
    description: "Custom domains and subdomains",
    icon: Globe,
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
  baseUrl: string;
  variant?: "sidebar" | "tabs";
}

export function ProjectNav({ baseUrl, variant = "sidebar" }: ProjectNavProps) {
  const pathname = usePathname();
  const activeTab = pathname.split("/").pop() as ProjectTab;

  if (variant === "tabs") {
    return (
      <LayoutGroup>
        <nav className="inline-flex w-fit items-center gap-1 rounded-full bg-muted p-1 text-muted-foreground">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <Link
                className={cn(
                  "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 font-medium text-foreground/60 text-sm transition-colors hover:text-foreground",
                  isActive && "text-foreground"
                )}
                href={`${baseUrl}/${id}`}
                key={id}
                prefetch
              >
                {isActive && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-background shadow-sm"
                    layoutId="project-tab-indicator"
                    transition={{
                      type: "spring",
                      bounce: 0.15,
                      duration: 0.4,
                    }}
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <Icon className="size-4 shrink-0" />
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </LayoutGroup>
    );
  }

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ id, label, description, icon: Icon }) => (
        <Link
          className={cn(
            "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
            activeTab === id
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
          )}
          href={`${baseUrl}/${id}`}
          key={id}
          prefetch
        >
          <Icon className="size-4 shrink-0" />
          <div className="flex flex-col">
            <span className="font-medium">{label}</span>
            <span className="hidden text-muted-foreground text-xs md:block">
              {description}
            </span>
          </div>
        </Link>
      ))}
    </nav>
  );
}
