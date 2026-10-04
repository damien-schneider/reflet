"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import {
  PageActions,
  PageBody,
  PageHeader,
  PageLayout,
  type PageLayoutProps,
} from "@ctrl-ui/react/ui/page-layout";
import { useSidebar } from "@ctrl-ui/react/ui/sidebar";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ctrl-ui/react/ui/tabs";
import { ArrowLeft } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { type FlowIssue, flowIssues } from "@reflet/survey-core";
import { useQuery } from "convex/react";
import Link from "next/link";
import { type ReactNode, use, useState } from "react";
import { TagBadge } from "@/components/tag-badge";
import { AnalyticsDashboard } from "@/features/surveys/components/analytics/analytics-dashboard";
import { ShareDialog } from "@/features/surveys/components/detail/share-dialog";
import {
  type LocatedIssue,
  StatusActions,
} from "@/features/surveys/components/detail/status-actions";
import {
  type DetailTab,
  detailTabs,
  SurveySectionPanel,
  SurveySectionPanelSkeleton,
  surveyListHref,
} from "@/features/surveys/components/detail/survey-section-panel";
import { SurveyTitle } from "@/features/surveys/components/detail/survey-title";
import { useSelectFlowStep } from "@/features/surveys/components/flow/flow-context";
import type { FlowSurvey } from "@/features/surveys/components/flow/flow-model";
import { SurveyFlowEditor } from "@/features/surveys/components/flow/survey-flow-editor";
import { ResponsesPanel } from "@/features/surveys/components/responses/responses-panel";
import { SurveySettings } from "@/features/surveys/components/settings/survey-settings";
import { STATUS_COLORS, STATUS_LABELS } from "@/features/surveys/lib/constants";

const COMPACT_HEADER: PageLayoutProps["style"] = {
  "--cui-page-layout-header-gap": "calc(var(--spacing) * 3)",
  "--cui-page-layout-header-start-gap": "calc(var(--spacing) * 4)",
};

function BackLink({
  className,
  orgSlug,
}: {
  className?: string;
  orgSlug: string;
}) {
  return (
    <Link
      className={cn(
        "inline-flex min-h-8 items-center gap-1 text-muted-foreground text-sm hover:text-foreground",
        className
      )}
      href={surveyListHref(orgSlug)}
    >
      <ArrowLeft aria-hidden className="size-4" />
      <span className="sr-only">Back to </span>
      Surveys
    </Link>
  );
}

export default function SurveyDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; surveyId: string }>;
}) {
  const { orgSlug, surveyId } = use(params);
  const survey = useQuery(api.surveys.queries.get, {
    surveyId: surveyId as Id<"surveys">,
  });

  if (survey === undefined) {
    return <SurveyDetailSkeleton orgSlug={orgSlug} />;
  }
  if (survey === null) {
    return <SurveyNotFound orgSlug={orgSlug} />;
  }
  return <SurveyDetail orgSlug={orgSlug} survey={survey} />;
}

const locateIssues = (survey: FlowSurvey): LocatedIssue[] =>
  flowIssues(survey.questions, survey.endings)
    .filter((issue) => issue.severity === "error")
    .map((issue) => {
      const index = survey.questions.findIndex(
        (q) => q._id === issue.questionId
      );
      const question = survey.questions[index];
      return question
        ? {
            ...issue,
            stepLabel: `Step ${index + 1} · ${question.title.trim() || "Untitled step"}`,
          }
        : issue;
    });

function SurveyDetail({
  orgSlug,
  survey,
}: {
  orgSlug: string;
  survey: FlowSurvey;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("flow");
  const [stepsOutlineContainer, setStepsOutlineContainer] =
    useState<HTMLDivElement | null>(null);
  const { isMobile } = useSidebar();
  const selectStep = useSelectFlowStep();

  const selectIssue = (issue: FlowIssue) => {
    setActiveTab("flow");
    const question = survey.questions.find((q) => q._id === issue.questionId);
    if (question) {
      selectStep(
        { kind: "question", questionId: question._id, ruleId: issue.ruleId },
        { reveal: true }
      );
    }
  };

  return (
    <PageLayout scroll="none" style={COMPACT_HEADER} width="full">
      <SurveySectionPanel
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        orgSlug={orgSlug}
        stepsOutlineRef={setStepsOutlineContainer}
        survey={survey}
      />
      <Tabs
        className="flex min-h-0 flex-1 flex-col"
        onValueChange={setActiveTab}
        value={activeTab}
      >
        <PageHeader className="flex flex-col items-stretch gap-2">
          <BackLink className="lg:hidden" orgSlug={orgSlug} />
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <SurveyTitle surveyId={survey._id} title={survey.title} />
              <TagBadge color={STATUS_COLORS[survey.status]}>
                {STATUS_LABELS[survey.status]}
              </TagBadge>
            </div>
            <PageActions>
              <ShareDialog survey={survey} />
              <StatusActions
                blockingIssues={locateIssues(survey)}
                onSelectIssue={selectIssue}
                status={survey.status}
                surveyId={survey._id}
              />
            </PageActions>
          </div>
          <TabsList className="self-start lg:hidden">
            {detailTabs(survey).map(({ count, label, value }) => (
              <TabsTab key={value} value={value}>
                {label}
                {count === undefined ? null : (
                  <span className="text-muted-foreground tabular-nums">
                    {count}
                  </span>
                )}
              </TabsTab>
            ))}
          </TabsList>
        </PageHeader>

        <TabsPanel className="flex min-h-0 flex-1" value="flow">
          <SurveyFlowEditor
            key={survey._id}
            onEditTrigger={() => setActiveTab("settings")}
            stepsOutlineContainer={isMobile ? null : stepsOutlineContainer}
            survey={survey}
          />
        </TabsPanel>
        <ScrollingPanel value="analytics">
          <AnalyticsDashboard surveyId={survey._id} />
        </ScrollingPanel>
        <ScrollingPanel value="responses">
          <ResponsesPanel surveyId={survey._id} />
        </ScrollingPanel>
        <ScrollingPanel value="settings">
          <SurveySettings survey={survey} />
        </ScrollingPanel>
      </Tabs>
    </PageLayout>
  );
}

function ScrollingPanel({
  children,
  value,
}: {
  children: ReactNode;
  value: DetailTab;
}) {
  return (
    <TabsPanel
      className="min-h-0 flex-1 overflow-y-auto border-t"
      value={value}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-8">{children}</div>
    </TabsPanel>
  );
}

function SurveyDetailSkeleton({ orgSlug }: { orgSlug: string }) {
  return (
    <PageLayout scroll="none" style={COMPACT_HEADER} width="full">
      <SurveySectionPanelSkeleton orgSlug={orgSlug} />
      <PageHeader className="flex flex-col items-start gap-2">
        <Skeleton className="h-5 w-24 lg:hidden" />
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-9 w-72 max-w-full lg:hidden" />
      </PageHeader>
      <div className="flex min-h-0 flex-1 border-t">
        <Skeleton className="m-6 flex-1 rounded-2xl" />
      </div>
    </PageLayout>
  );
}

function SurveyNotFound({ orgSlug }: { orgSlug: string }) {
  return (
    <PageLayout width="wide">
      <PageHeader className="flex flex-col items-start">
        <BackLink orgSlug={orgSlug} />
      </PageHeader>
      <PageBody>
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyTitle>Survey not found</EmptyTitle>
            <EmptyDescription>
              It may have been deleted, or the link is wrong.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <ButtonLink
              render={<Link href={surveyListHref(orgSlug)} />}
              variant="surface"
            >
              See all surveys
            </ButtonLink>
          </EmptyContent>
        </Empty>
      </PageBody>
    </PageLayout>
  );
}
