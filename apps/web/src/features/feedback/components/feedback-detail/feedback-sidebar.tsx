"use client";

import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";

import { Separator } from "@/components/ui/separator";
import { useFeedbackSidebar } from "./hooks/use-feedback-sidebar";
import { SidebarAssigneeSection } from "./sidebar-assignee-section";
import { SidebarDifficultySection } from "./sidebar-difficulty-section";
import { SidebarMetadata } from "./sidebar-metadata";
import { SidebarStatusSection } from "./sidebar-status-section";
import { SidebarSubscriptionSection } from "./sidebar-subscription-section";
import { SidebarVotingSection } from "./sidebar-voting-section";

interface FeedbackSidebarProps {
  feedbackId: Id<"feedback">;
  feedback: {
    hasVoted: boolean;
    voteCount: number;
    organizationStatusId?: Id<"organizationStatuses"> | null;
    createdAt: number;
    author?: {
      name?: string | null;
      email?: string;
      image?: string | null;
    } | null;
    assignee?: {
      id: string;
      name?: string | null;
      email?: string;
      image?: string | null;
    } | null;
  };
  organizationId?: Id<"organizations">;
  isAdmin: boolean;
}

export function FeedbackSidebar({
  feedbackId,
  feedback,
  organizationId,
  isAdmin,
}: FeedbackSidebarProps) {
  const {
    organizationStatuses,
    isSubscribed,
    members,
    difficultyEstimate,
    isGeneratingDifficulty,
    handleVote,
    handleStatusChange,
    handleToggleSubscription,
    handleAssigneeChange,
    handleGenerateDifficulty,
  } = useFeedbackSidebar({
    feedbackId,
    organizationId,
    isAdmin,
  });

  const currentStatus = organizationStatuses?.find(
    (s) => s._id === feedback.organizationStatusId
  );

  return (
    <div className="flex w-full flex-col gap-6 border-t p-6 md:w-80 md:border-t-0 md:border-l">
      <SidebarVotingSection
        hasVoted={feedback.hasVoted}
        onVote={handleVote}
        voteCount={feedback.voteCount}
      />

      <Separator />

      <div>
        <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Status
        </h4>
        <SidebarStatusSection
          currentStatus={currentStatus}
          isAdmin={isAdmin}
          onStatusChange={handleStatusChange}
          organizationStatuses={organizationStatuses}
          statusId={feedback.organizationStatusId}
        />
      </div>

      <SidebarMetadata
        author={feedback.author}
        createdAt={feedback.createdAt}
      />

      {isAdmin && members && (
        <div>
          <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Assignee
          </h4>
          <SidebarAssigneeSection
            assignee={feedback.assignee}
            members={members}
            onAssigneeChange={handleAssigneeChange}
          />
        </div>
      )}

      {isAdmin && (
        <div>
          <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            AI Difficulty Estimate
          </h4>
          <SidebarDifficultySection
            estimate={difficultyEstimate ?? undefined}
            isGenerating={isGeneratingDifficulty}
            onGenerate={handleGenerateDifficulty}
          />
        </div>
      )}

      <Separator />

      <SidebarSubscriptionSection
        isSubscribed={isSubscribed}
        onToggleSubscription={handleToggleSubscription}
      />
    </div>
  );
}
