"use client";

import {
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@ctrl-ui/react/ui/sidebar";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import {
  ChartBar,
  FlowArrow,
  Gear,
  type Icon,
  ListChecks,
} from "@phosphor-icons/react";
import type { Ref } from "react";
import { SectionPanel } from "@/features/dashboard/components/section-panel";
import type { FlowSurvey } from "@/features/surveys/components/flow/flow-model";

export type DetailTab = "flow" | "analytics" | "responses" | "settings";

interface DetailTabEntry {
  count?: number;
  icon: Icon;
  label: string;
  value: DetailTab;
}

export const detailTabs = (survey: FlowSurvey): DetailTabEntry[] => [
  {
    count: survey.questions.length,
    icon: FlowArrow,
    label: "Flow",
    value: "flow",
  },
  { icon: ChartBar, label: "Analytics", value: "analytics" },
  {
    count: survey.responseCount,
    icon: ListChecks,
    label: "Responses",
    value: "responses",
  },
  { icon: Gear, label: "Settings", value: "settings" },
];

export const surveyListHref = (orgSlug: string) =>
  `/dashboard/${orgSlug}/surveys`;

export function SurveySectionPanel({
  activeTab,
  onSelectTab,
  orgSlug,
  stepsOutlineRef,
  survey,
}: {
  activeTab: DetailTab;
  onSelectTab: (tab: DetailTab) => void;
  orgSlug: string;
  stepsOutlineRef: Ref<HTMLDivElement>;
  survey: FlowSurvey;
}) {
  return (
    <SectionPanel backHref={surveyListHref(orgSlug)} title="Surveys">
      <SidebarGroup className="shrink-0">
        <SidebarMenu aria-label="Survey views">
          {detailTabs(survey).map(({ count, icon: TabIcon, label, value }) => (
            <SidebarMenuItem key={value}>
              <SidebarMenuButton
                aria-current={value === activeTab ? "page" : undefined}
                isActive={value === activeTab}
                onClick={() => onSelectTab(value)}
              >
                <TabIcon aria-hidden />
                <span className="flex-1">{label}</span>
                {count === undefined ? null : (
                  <span className="text-muted-foreground tabular-nums">
                    {count}
                  </span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
      <div className="flex min-h-0 flex-1 flex-col" ref={stepsOutlineRef} />
    </SectionPanel>
  );
}

export function SurveySectionPanelSkeleton({ orgSlug }: { orgSlug: string }) {
  return (
    <SectionPanel backHref={surveyListHref(orgSlug)} title="Surveys">
      <SidebarContent className="gap-2 p-3">
        <Skeleton className="h-control-sm w-full" />
        <Skeleton className="h-control-sm w-full" />
        <Skeleton className="h-control-sm w-full" />
        <Skeleton className="h-control-sm w-full" />
      </SidebarContent>
    </SectionPanel>
  );
}
