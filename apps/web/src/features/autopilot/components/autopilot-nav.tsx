"use client";

import {
  IconActivity,
  IconBook,
  IconChartBar,
  IconDashboard,
  IconFileText,
  IconGitBranch,
  IconInbox,
  IconRobot,
  IconSettings,
  IconUserSearch,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: IconDashboard, path: "" },
  { id: "agents", label: "Agents", icon: IconRobot, path: "/agents" },
  { id: "inbox", label: "Inbox", icon: IconInbox, path: "/inbox" },
  { id: "chain", label: "Chain", icon: IconGitBranch, path: "/chain" },
  { id: "knowledge", label: "Product", icon: IconBook, path: "/knowledge" },
  {
    id: "documents",
    label: "Documents",
    icon: IconFileText,
    path: "/documents",
  },
  { id: "reports", label: "Reports", icon: IconChartBar, path: "/reports" },
  { id: "activity", label: "Activity", icon: IconActivity, path: "/activity" },
  { id: "sales", label: "Sales", icon: IconUserSearch, path: "/sales" },
  { id: "settings", label: "Settings", icon: IconSettings, path: "/settings" },
] as const;

function getPathSegment(path: string): string {
  return path.split("/").filter(Boolean)[0] ?? "";
}

export function AutopilotNav({
  baseUrl,
  variant = "sidebar",
}: {
  baseUrl: string;
  variant?: "sidebar" | "tabs";
}) {
  const pathname = usePathname();

  const getActiveTab = () => {
    const suffix = pathname.replace(baseUrl, "");
    const activeSegment = getPathSegment(suffix);
    const match = NAV_ITEMS.find(
      (item) => getPathSegment(item.path) === activeSegment
    );
    return match?.id ?? "dashboard";
  };

  const activeTab = getActiveTab();

  if (variant === "tabs") {
    return (
      <nav className="flex gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <Link
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
              href={`${baseUrl}${item.path}`}
              key={item.id}
            >
              <item.icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <Link
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-sm transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
            href={`${baseUrl}${item.path}`}
            key={item.id}
          >
            <item.icon className="size-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
