"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { ClipboardText } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { SurveyCard } from "@/features/surveys/components/survey-card";
import { STATUS_LABELS } from "@/features/surveys/lib/constants";
import type {
  SurveyStatus,
  SurveyStatusFilter,
  TriggerType,
} from "@/store/surveys";

interface SurveyItem {
  _id: Id<"surveys">;
  completionRate: number;
  createdAt: number;
  description?: string;
  questionCount: number;
  responseCount: number;
  status: SurveyStatus;
  title: string;
  triggerType: TriggerType;
}

interface SurveyListProps {
  onDelete: (surveyId: Id<"surveys">) => void;
  onStatusChange: (surveyId: Id<"surveys">, status: SurveyStatus) => void;
  orgSlug: string;
  statusFilter: SurveyStatusFilter;
  surveys: SurveyItem[] | undefined;
}

export function SurveyListSkeleton() {
  return (
    <div
      aria-label="Loading surveys"
      className="flex flex-col gap-3"
      role="status"
    >
      {["sk-1", "sk-2", "sk-3"].map((id) => (
        <div className="flex flex-col gap-2 rounded-lg border p-4" key={id}>
          <Skeleton className="h-5 w-56 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <Skeleton className="h-3.5 w-96 max-w-full" />
        </div>
      ))}
    </div>
  );
}

export function SurveyList({
  surveys,
  orgSlug,
  statusFilter,
  onStatusChange,
  onDelete,
}: SurveyListProps) {
  if (!surveys) {
    return <SurveyListSkeleton />;
  }

  if (surveys.length === 0) {
    const isFiltered = statusFilter !== "all";
    return (
      <Empty className="rounded-lg border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia>
            <ClipboardText aria-hidden className="size-6" />
          </EmptyMedia>
          <EmptyTitle>
            {isFiltered
              ? `No ${STATUS_LABELS[statusFilter].toLowerCase()} surveys`
              : "No surveys yet"}
          </EmptyTitle>
          <EmptyDescription>
            {isFiltered
              ? "Surveys move here when you change their status."
              : "Create a survey to ask users questions right inside your product."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {surveys.map((survey) => (
        <li key={survey._id}>
          <SurveyCard
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            orgSlug={orgSlug}
            survey={survey}
          />
        </li>
      ))}
    </ul>
  );
}
