"use client";

import {
  PageActions,
  PageBody,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ctrl-ui/react/ui/tabs";
import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { use, useState } from "react";
import { CreateSurveyDialog } from "@/features/surveys/components/create-survey-dialog";
import { SurveyList } from "@/features/surveys/components/survey-list";
import type { SurveyStatus } from "@/store/surveys";

export default function SurveysPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const surveys = useQuery(
    api.surveys.queries.list,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const updateStatus = useMutation(api.surveys.mutations.updateStatus);
  const deleteSurveyMutation = useMutation(api.surveys.mutations.deleteSurvey);

  const [statusFilter, setStatusFilter] = useState("all");

  const handleStatusChange = async (
    surveyId: Id<"surveys">,
    status: SurveyStatus
  ) => {
    try {
      await updateStatus({ status, surveyId });
      toast.success(`Survey ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (surveyId: Id<"surveys">) => {
    try {
      await deleteSurveyMutation({ surveyId });
      toast.success("Survey deleted");
    } catch {
      toast.error("Failed to delete survey");
    }
  };

  const filteredSurveys =
    statusFilter === "all"
      ? surveys
      : surveys?.filter((s) => s.status === statusFilter);

  if (!org) {
    return (
      <PageLayout scroll="page" width="content">
        <PageBody>
          <Skeleton className="h-8 w-48" />
        </PageBody>
      </PageLayout>
    );
  }

  return (
    <PageLayout scroll="page" width="content">
      <PageHeader>
        <PageTitle>Surveys</PageTitle>
        <PageActions>
          <CreateSurveyDialog organizationId={org._id} />
        </PageActions>
      </PageHeader>
      <PageBody>
        <Tabs onValueChange={setStatusFilter} value={statusFilter}>
          <TabsList>
            <TabsTab value="all">All</TabsTab>
            <TabsTab value="draft">Draft</TabsTab>
            <TabsTab value="active">Active</TabsTab>
            <TabsTab value="paused">Paused</TabsTab>
            <TabsTab value="closed">Closed</TabsTab>
          </TabsList>

          <TabsPanel className="mt-4" value={statusFilter}>
            <SurveyList
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              orgSlug={orgSlug}
              surveys={filteredSurveys}
            />
          </TabsPanel>
        </Tabs>
      </PageBody>
    </PageLayout>
  );
}
