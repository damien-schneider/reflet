"use client";

import {
  IconChartBar,
  IconCurrencyDollar,
  IconDashboard,
  IconInbox,
  IconListDetails,
  IconMail,
  IconMessageCircle,
  IconRocket,
  IconServer,
  IconSettings,
  IconShield,
  IconUserSearch,
} from "@tabler/icons-react";
import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: IconDashboard, path: "" },
  { id: "inbox", label: "Inbox", icon: IconInbox, path: "/inbox" },
  { id: "tasks", label: "Tasks", icon: IconListDetails, path: "/tasks" },
  {
    id: "growth",
    label: "Growth & Intel",
    icon: IconRocket,
    path: "/growth",
  },
  {
    id: "security",
    label: "Security",
    icon: IconShield,
    path: "/security",
  },
  {
    id: "support",
    label: "Support",
    icon: IconMessageCircle,
    path: "/support",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: IconChartBar,
    path: "/analytics",
  },
  { id: "ops", label: "Ops", icon: IconServer, path: "/ops" },
  { id: "sales", label: "Sales", icon: IconUserSearch, path: "/sales" },
  { id: "email", label: "Email", icon: IconMail, path: "/email" },
  { id: "costs", label: "Costs", icon: IconCurrencyDollar, path: "/costs" },
  { id: "settings", label: "Settings", icon: IconSettings, path: "/settings" },
] as const;

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
    const match = NAV_ITEMS.find((item) =>
      item.path === ""
        ? suffix === "" || suffix === "/"
        : suffix.startsWith(item.path)
    );
    return match?.id ?? "dashboard";
  };

  const activeTab = getActiveTab();

  if (variant === "tabs") {
    return (
      <LayoutGroup id="autopilot-tabs">
        <nav className="flex gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <Link
                className={cn(
                  "relative flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                href={`${baseUrl}${item.path}`}
                key={item.id}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-md bg-muted"
                    layoutId="autopilot-active-tab"
                    style={{ zIndex: -1 }}
                    transition={{
                      type: "spring",
                      bounce: 0.2,
                      duration: 0.4,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </LayoutGroup>
    );
  }

  return (
    <LayoutGroup id="autopilot-sidebar">
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <Link
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-sm transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
              href={`${baseUrl}${item.path}`}
              key={item.id}
            >
              <item.icon className="size-4 shrink-0" />
              <span>{item.label}</span>
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-lg bg-muted"
                  layoutId="autopilot-active-sidebar"
                  style={{ zIndex: -1 }}
                  transition={{
                    type: "spring",
                    bounce: 0.2,
                    duration: 0.4,
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}
