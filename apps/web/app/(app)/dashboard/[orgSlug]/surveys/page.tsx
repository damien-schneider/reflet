"use client";

import {
  PageActions,
  PageBody,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { use } from "react";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";
import { CreateSurveyDialog } from "@/features/surveys/components/create-survey-dialog";
import {
  SurveyList,
  SurveyListSkeleton,
} from "@/features/surveys/components/survey-list";
import { STATUS_LABELS } from "@/features/surveys/lib/constants";
import type { SurveyStatus, SurveyStatusFilter } from "@/store/surveys";

const isSurveyStatus = (value: string | undefined): value is SurveyStatus =>
  value !== undefined && value in STATUS_LABELS;

export default function SurveysPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { orgSlug } = use(params);
  const { status } = use(searchParams);
  const statusFilter: SurveyStatusFilter = isSurveyStatus(status)
    ? status
    : "all";
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const surveys = useQuery(
    api.surveys.queries.list,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const updateStatus = useMutation(api.surveys.mutations.updateStatus);
  const deleteSurveyMutation = useMutation(api.surveys.mutations.deleteSurvey);

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
      <PageLayout width="content">
        <PageHeader>
          <Skeleton className="h-9 w-40" />
        </PageHeader>
        <PageBody contentClassName="space-y-4">
          <SurveyListSkeleton />
        </PageBody>
      </PageLayout>
    );
  }

  return (
    <PageLayout width="content">
      <PageHeader>
        <PageTitle>
          {statusFilter === "all"
            ? "Surveys"
            : `${STATUS_LABELS[statusFilter]} surveys`}
        </PageTitle>
        <PageActions>
          <CreateSurveyDialog organizationId={org._id} orgSlug={orgSlug} />
        </PageActions>
      </PageHeader>
      <PageBody>
        <SurveyList
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          orgSlug={orgSlug}
          statusFilter={statusFilter}
          surveys={filteredSurveys}
        />
      </PageBody>
    </PageLayout>
  );
}
