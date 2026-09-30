"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  PageActions,
  PageBody,
  PageDescription,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ctrl-ui/react/ui/tabs";
import { toast } from "@ctrl-ui/react/ui/toast";
import { ArrowLeft, PencilSimple } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { type FormEvent, use, useState } from "react";
import { TagBadge } from "@/components/tag-badge";
import { AnalyticsDashboard } from "@/features/surveys/components/analytics-dashboard";
import { QuestionEditor } from "@/features/surveys/components/question-editor";
import { StatusActions } from "@/features/surveys/components/status-actions";
import { SurveyPreview } from "@/features/surveys/components/survey-preview";
import {
  type SettingsSurvey,
  SurveySettings,
} from "@/features/surveys/components/survey-settings";
import { STATUS_COLORS, STATUS_LABELS } from "@/features/surveys/lib/constants";
import type { SurveyQuestion, SurveyStatus } from "@/store/surveys";

function BackLink({ orgSlug }: { orgSlug: string }) {
  return (
    <Link
      className="inline-flex min-h-10 items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
      href={`/dashboard/${orgSlug}/surveys`}
    >
      <ArrowLeft aria-hidden className="size-4" />
      Back to surveys
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
  const updateStatus = useMutation(api.surveys.mutations.updateStatus);

  if (survey === undefined) {
    return <SurveyDetailSkeleton />;
  }

  if (survey === null) {
    return <SurveyNotFound orgSlug={orgSlug} />;
  }

  const handleStatusChange = async (status: SurveyStatus) => {
    try {
      await updateStatus({ status, surveyId: survey._id });
    } catch {
      toast.error("Couldn’t change the survey status. Try again.");
    }
  };

  return (
    <PageLayout scroll="page" width="wide">
      <PageHeader className="flex flex-col items-start">
        <BackLink orgSlug={orgSlug} />
        <div className="flex w-full flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <SurveyTitle surveyId={survey._id} title={survey.title} />
            <TagBadge color={STATUS_COLORS[survey.status]}>
              {STATUS_LABELS[survey.status]}
            </TagBadge>
          </div>
          <PageActions>
            <StatusActions
              hasQuestions={survey.questions.length > 0}
              onStatusChange={handleStatusChange}
              status={survey.status}
            />
          </PageActions>
        </div>
        {survey.description ? (
          <PageDescription>{survey.description}</PageDescription>
        ) : null}
      </PageHeader>

      <PageBody>
        <SurveyDetailTabs survey={survey} />
      </PageBody>
    </PageLayout>
  );
}

function SurveyDetailTabs({
  survey,
}: {
  survey: SettingsSurvey & { questions: SurveyQuestion[] };
}) {
  const [activeTab, setActiveTab] = useState("builder");

  return (
    <Tabs onValueChange={setActiveTab} value={activeTab}>
      <TabsList>
        <TabsTab value="builder">
          Builder
          <span className="text-muted-foreground tabular-nums">
            {survey.questions.length}
          </span>
        </TabsTab>
        <TabsTab value="analytics">Analytics</TabsTab>
        <TabsTab value="settings">Settings</TabsTab>
      </TabsList>

      <TabsPanel className="mt-6" value="builder">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <QuestionEditor questions={survey.questions} surveyId={survey._id} />
          <section
            aria-labelledby="survey-preview-heading"
            className="self-start lg:sticky lg:top-6"
          >
            <h2
              className="mb-3 font-medium text-muted-foreground text-sm"
              id="survey-preview-heading"
            >
              Live preview
            </h2>
            <SurveyPreview
              description={survey.description}
              questions={survey.questions}
              title={survey.title}
            />
          </section>
        </div>
      </TabsPanel>

      <TabsPanel className="mt-6" value="analytics">
        <AnalyticsDashboard surveyId={survey._id} />
      </TabsPanel>

      <TabsPanel className="mt-6" value="settings">
        <SurveySettings survey={survey} />
      </TabsPanel>
    </Tabs>
  );
}

function SurveyDetailSkeleton() {
  return (
    <PageLayout scroll="page" width="wide">
      <PageHeader className="flex flex-col items-start">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-80 max-w-full" />
      </PageHeader>
      <PageBody contentClassName="space-y-6">
        <Skeleton className="h-9 w-72 max-w-full" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </PageBody>
    </PageLayout>
  );
}

function SurveyNotFound({ orgSlug }: { orgSlug: string }) {
  return (
    <PageLayout scroll="page" width="wide">
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
              render={<Link href={`/dashboard/${orgSlug}/surveys`} />}
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

function SurveyTitle({
  surveyId,
  title,
}: {
  surveyId: Id<"surveys">;
  title: string;
}) {
  const updateSurvey = useMutation(api.surveys.mutations.update);
  const [draft, setDraft] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft === null || !draft.trim()) {
      return;
    }
    if (draft.trim() === title) {
      setDraft(null);
      return;
    }
    setIsSaving(true);
    try {
      await updateSurvey({ surveyId, title: draft.trim() });
      setDraft(null);
    } catch {
      toast.error("Couldn’t rename the survey. Try again.");
    }
    setIsSaving(false);
  };

  if (draft === null) {
    return (
      <PageTitle className="min-w-0">
        <button
          className="group inline-flex max-w-full items-center gap-2 text-left"
          onClick={() => setDraft(title)}
          type="button"
        >
          <span className="truncate" title={title}>
            {title}
          </span>
          <PencilSimple
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground"
          />
          <span className="sr-only">Rename survey</span>
        </button>
      </PageTitle>
    );
  }

  return (
    <form
      className="flex min-w-0 flex-1 items-center gap-2"
      onSubmit={handleSubmit}
    >
      <Input
        aria-label="Survey title"
        autoFocus
        className="min-w-0 flex-1"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft(null);
          }
        }}
        size="lg"
        value={draft}
      />
      <Button
        disabled={!draft.trim() || isSaving}
        tone="primary"
        type="submit"
        variant="solid"
      >
        {isSaving ? "Saving…" : "Save"}
      </Button>
      <Button onClick={() => setDraft(null)} variant="ghost">
        Cancel
      </Button>
    </form>
  );
}
