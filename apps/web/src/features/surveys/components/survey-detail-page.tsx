"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ctrl-ui/react/ui/tabs";
import { toast } from "@ctrl-ui/react/ui/toast";
import { ArrowLeft } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { use, useState } from "react";
import { TagBadge } from "@/components/tag-badge";
import { H1, Text } from "@/components/ui/typography";
import { AnalyticsDashboard } from "@/features/surveys/components/analytics-dashboard";
import { QuestionEditor } from "@/features/surveys/components/question-editor";
import { StatusActions } from "@/features/surveys/components/status-actions";
import { SurveyPreview } from "@/features/surveys/components/survey-preview";
import { SurveySettings } from "@/features/surveys/components/survey-settings";
import { STATUS_COLORS } from "@/features/surveys/lib/constants";
import type { SurveyStatus } from "@/store/surveys";

export default function SurveyDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; surveyId: string }>;
}) {
  const { orgSlug, surveyId } = use(params);
  const survey = useQuery(api.surveys.queries.get, {
    surveyId: surveyId as Id<"surveys">,
  });
  const updateSurvey = useMutation(api.surveys.mutations.update);
  const updateStatus = useMutation(api.surveys.mutations.updateStatus);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [activeTab, setActiveTab] = useState("builder");

  if (survey === undefined) {
    return (
      <div className="admin-container">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  if (survey === null) {
    return (
      <div className="admin-container">
        <H1>Survey not found</H1>
      </div>
    );
  }

  const handleTitleSave = async () => {
    if (!editTitle.trim()) {
      return;
    }
    try {
      await updateSurvey({
        surveyId: survey._id,
        title: editTitle.trim(),
      });
      setIsEditingTitle(false);
      toast.success("Title updated");
    } catch {
      toast.error("Failed to update title");
    }
  };

  const handleStatusChange = async (status: SurveyStatus) => {
    try {
      await updateStatus({ status, surveyId: survey._id });
      toast.success(`Survey ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="admin-container">
      <div className="mb-2">
        <Link
          className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
          href={`/dashboard/${orgSlug}/surveys`}
        >
          <ArrowLeft className="size-4" />
          Back to Surveys
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div className="flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                className="font-bold text-2xl"
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTitleSave();
                  }
                  if (e.key === "Escape") {
                    setIsEditingTitle(false);
                  }
                }}
                value={editTitle}
              />
              <Button
                onClick={handleTitleSave}
                size="xs"
                tone="primary"
                variant="solid"
              >
                Save
              </Button>
              <Button
                onClick={() => setIsEditingTitle(false)}
                size="xs"
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              className="flex items-center gap-2"
              onClick={() => {
                setEditTitle(survey.title);
                setIsEditingTitle(true);
              }}
              type="button"
            >
              <H1>{survey.title}</H1>
              <TagBadge color={STATUS_COLORS[survey.status]}>
                {survey.status}
              </TagBadge>
            </button>
          )}
          {survey.description ? (
            <Text className="mt-1" variant="bodySmall">
              {survey.description}
            </Text>
          ) : null}
        </div>

        <StatusActions
          hasQuestions={survey.questions.length > 0}
          onStatusChange={handleStatusChange}
          status={survey.status}
        />
      </div>

      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList>
          <TabsTab value="builder">Builder ({survey.questions.length})</TabsTab>
          <TabsTab value="analytics">Analytics</TabsTab>
          <TabsTab value="settings">Settings</TabsTab>
        </TabsList>

        <TabsPanel className="mt-6" value="builder">
          <div className="grid grid-cols-[1fr_360px] gap-8">
            <QuestionEditor
              questions={survey.questions}
              surveyId={survey._id}
            />
            <div className="sticky top-6 self-start">
              <p className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Live Preview
              </p>
              <SurveyPreview
                description={survey.description}
                questions={survey.questions}
                title={survey.title}
              />
            </div>
          </div>
        </TabsPanel>

        <TabsPanel className="mt-6" value="analytics">
          <AnalyticsDashboard surveyId={survey._id} />
        </TabsPanel>

        <TabsPanel className="mt-6" value="settings">
          <SurveySettings survey={survey} />
        </TabsPanel>
      </Tabs>
    </div>
  );
}
