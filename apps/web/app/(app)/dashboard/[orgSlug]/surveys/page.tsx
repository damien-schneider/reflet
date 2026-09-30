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
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";
import { CreateSurveyDialog } from "@/features/surveys/components/create-survey-dialog";
import {
  SurveyList,
  SurveyListSkeleton,
} from "@/features/surveys/components/survey-list";
import { STATUS_LABELS } from "@/features/surveys/lib/constants";
import type { SurveyStatus, SurveyStatusFilter } from "@/store/surveys";

const STATUS_FILTERS: SurveyStatus[] = ["draft", "active", "paused", "closed"];

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

  const [statusFilter, setStatusFilter] = useState<SurveyStatusFilter>("all");

  const handleStatusChange = async (
    surveyId: Id<"surveys">,
    status: SurveyStatus
  ) => {
    try {
      await updateStatus({ status, surveyId });
    } catch {
      toast.error("Couldn’t change the survey status. Try again.");
    }
  };

  const handleDelete = async (surveyId: Id<"surveys">) => {
    try {
      await deleteSurveyMutation({ surveyId });
    } catch {
      toast.error("Couldn’t delete the survey. Try again.");
    }
  };

  const filteredSurveys =
    statusFilter === "all"
      ? surveys
      : surveys?.filter((s) => s.status === statusFilter);

  if (org === null) {
    return <OrgNotFound />;
  }

  if (org === undefined) {
    return (
      <PageLayout scroll="page" width="content">
        <PageHeader>
          <Skeleton className="h-9 w-40" />
        </PageHeader>
        <PageBody contentClassName="space-y-4">
          <Skeleton className="h-9 w-80 max-w-full" />
          <SurveyListSkeleton />
        </PageBody>
      </PageLayout>
    );
  }

  return (
    <PageLayout scroll="page" width="content">
      <PageHeader>
        <PageTitle>Surveys</PageTitle>
        <PageActions>
          <CreateSurveyDialog organizationId={org._id} orgSlug={orgSlug} />
        </PageActions>
      </PageHeader>
      <PageBody>
        <Tabs onValueChange={setStatusFilter} value={statusFilter}>
          <TabsList>
            <TabsTab value="all">All</TabsTab>
            {STATUS_FILTERS.map((status) => (
              <TabsTab key={status} value={status}>
                {STATUS_LABELS[status]}
              </TabsTab>
            ))}
          </TabsList>

          <TabsPanel className="mt-4" value={statusFilter}>
            <SurveyList
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              orgSlug={orgSlug}
              statusFilter={statusFilter}
              surveys={filteredSurveys}
            />
          </TabsPanel>
        </Tabs>
      </PageBody>
    </PageLayout>
  );
}
