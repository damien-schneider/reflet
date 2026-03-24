"use client";

import { ClipboardText } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { Muted } from "@/components/ui/typography";
import { SurveyCard } from "@/features/surveys/components/survey-card";
import type { SurveyStatus, TriggerType } from "@/store/surveys";

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
  surveys: SurveyItem[] | undefined;
}

export function SurveyList({
  surveys,
  orgSlug,
  onStatusChange,
  onDelete,
}: SurveyListProps) {
  if (!surveys) {
    return (
      <div className="flex flex-col gap-3">
        {["sk-1", "sk-2", "sk-3"].map((id) => (
          <Skeleton className="h-24 w-full" key={id} />
        ))}
      </div>
    );
  }

  if (surveys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <ClipboardText className="mb-4 size-12 text-muted-foreground" />
        <Muted>No surveys found</Muted>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {surveys.map((survey) => (
        <SurveyCard
          key={survey._id}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          orgSlug={orgSlug}
          survey={survey}
        />
      ))}
    </div>
  );
}
