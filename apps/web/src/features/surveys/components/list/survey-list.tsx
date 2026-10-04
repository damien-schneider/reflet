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
import {
  SurveyCard,
  type SurveyCardActions,
  type SurveyListItem,
} from "@/features/surveys/components/list/survey-card";
import { STATUS_LABELS } from "@/features/surveys/lib/constants";
import type { SurveyStatusFilter } from "@/store/surveys";

interface SurveyListProps extends SurveyCardActions {
  orgSlug: string;
  statusFilter: SurveyStatusFilter;
  surveys: SurveyListItem[] | undefined;
}

export function SurveyListSkeleton() {
  return (
    <div
      aria-label="Loading surveys"
      className="flex flex-col gap-3"
      role="status"
    >
      {["sk-1", "sk-2", "sk-3"].map((id) => (
        <div className="flex flex-col gap-2 rounded-xl border p-4" key={id}>
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
  ...actions
}: SurveyListProps) {
  if (!surveys) {
    return <SurveyListSkeleton />;
  }

  if (surveys.length === 0) {
    const isFiltered = statusFilter !== "all";
    return (
      <Empty className="rounded-xl border border-dashed py-16">
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
              : "Create a survey to ask users questions inside your product or with a shareable link."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {surveys.map((survey) => (
        <li key={survey._id}>
          <SurveyCard orgSlug={orgSlug} survey={survey} {...actions} />
        </li>
      ))}
    </ul>
  );
}
