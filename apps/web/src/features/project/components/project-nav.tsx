"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ctrl-ui/react/ui/collapsible";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  useSidebar,
} from "@ctrl-ui/react/ui/sidebar";
import { CaretRight, Cube } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const PROJECT_SECTIONS = [
  { id: "github", label: "GitHub" },
  { id: "agents", label: "Agents & CLI" },
  { id: "api-keys", label: "API Keys" },
  { id: "general", label: "Organization" },
  { id: "domains", label: "Domains" },
  { id: "members", label: "Members" },
  { id: "billing", label: "Billing" },
];

function ProjectSectionLinks({ baseUrl }: { baseUrl: string }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenuSub aria-label="Project">
      {PROJECT_SECTIONS.map(({ id, label }) => {
        const href = `${baseUrl}/${id}`;
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <SidebarMenuItem key={id}>
            <SidebarMenuButton
              aria-current={isActive ? "page" : undefined}
              isActive={isActive}
              render={
                <Link href={href} onNavigate={() => setOpenMobile(false)} />
              }
            >
              <span>{label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenuSub>
  );
}

export function ProjectNav({ baseUrl }: { baseUrl: string }) {
  const pathname = usePathname();
  const isProjectRoute =
    pathname === baseUrl || pathname.startsWith(`${baseUrl}/`);
  const [expanded, setExpanded] = useState(isProjectRoute);
  const { isMobile, setOpen, state } = useSidebar();
  const highlightProject =
    isProjectRoute && (!expanded || state === "collapsed");

  function changeExpanded(nextExpanded: boolean) {
    if (!isMobile && state === "collapsed") {
      setOpen(true);
      setExpanded(true);
      return;
    }
    setExpanded(nextExpanded);
  }

  return (
    <SidebarMenuItem>
      <Collapsible onOpenChange={changeExpanded} open={expanded}>
        <SidebarMenuButton
          isActive={highlightProject}
          render={<CollapsibleTrigger />}
          tooltip="Project"
        >
          <Cube />
          <span className="flex-1">Project</span>
          <CaretRight
            className="group-data-[collapsible=icon]:hidden"
            data-control-ui="sidebar"
            data-slot="chevron"
          />
        </SidebarMenuButton>
        <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
          <ProjectSectionLinks baseUrl={baseUrl} />
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
