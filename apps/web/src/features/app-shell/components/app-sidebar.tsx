"use client";

import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import type * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarList,
  SidebarListButton,
  SidebarListItem,
} from "@/components/ui/sidebar";
import { NavDocuments } from "@/features/navigation/components/nav-documents";
import { NavMain } from "@/features/navigation/components/nav-main";
import { NavSecondary } from "@/features/navigation/components/nav-secondary";
import { NavUser } from "@/features/navigation/components/nav-user";

const data = {
  documents: [
    {
      icon: IconDatabase,
      name: "Data Library",
      url: "#",
    },
    {
      icon: IconReport,
      name: "Reports",
      url: "#",
    },
    {
      icon: IconFileWord,
      name: "Word Assistant",
      url: "#",
    },
  ],
  navClouds: [
    {
      icon: IconCamera,
      isActive: true,
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
      title: "Capture",
      url: "#",
    },
    {
      icon: IconFileDescription,
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
      title: "Proposal",
      url: "#",
    },
    {
      icon: IconFileAi,
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
      title: "Prompts",
      url: "#",
    },
  ],
  navMain: [
    {
      icon: IconDashboard,
      title: "Dashboard",
      url: "#",
    },
    {
      icon: IconListDetails,
      title: "Lifecycle",
      url: "#",
    },
    {
      icon: IconChartBar,
      title: "Analytics",
      url: "#",
    },
    {
      icon: IconFolder,
      title: "Projects",
      url: "#",
    },
    {
      icon: IconUsers,
      title: "Team",
      url: "#",
    },
  ],
  navSecondary: [
    {
      icon: IconSettings,
      title: "Gear",
      url: "#",
    },
    {
      icon: IconHelp,
      title: "Get Help",
      url: "#",
    },
    {
      icon: IconSearch,
      title: "MagnifyingGlass",
      url: "#",
    },
  ],
  user: {
    avatar: "/avatars/shadcn.jpg",
    email: "m@example.com",
    name: "shadcn",
  },
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarList>
          <SidebarListItem>
            <SidebarListButton
              className="data-[slot=sidebar-menu-button]:!p-1.5"
              render={(props) => (
                <Link href="/" {...props}>
                  <IconInnerShadowTop className="!size-5" />
                  <span className="font-semibold text-base">Acme Inc.</span>
                </Link>
              )}
            />
          </SidebarListItem>
        </SidebarList>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} title="Documents" />
        <NavSecondary className="mt-auto" items={data.navSecondary} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
