"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { use, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { H1, Text } from "@/components/ui/typography";
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
      await updateStatus({ surveyId, status });
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
      <div className="admin-container">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <H1>Surveys</H1>
          <Text variant="bodySmall">
            Create and manage surveys to collect structured feedback
          </Text>
        </div>
        <CreateSurveyDialog organizationId={org._id} />
      </div>

      <Tabs onValueChange={setStatusFilter} value={statusFilter}>
        <TabsList variant="line">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="paused">Paused</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4" value={statusFilter}>
          <SurveyList
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            orgSlug={orgSlug}
            surveys={filteredSurveys}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
