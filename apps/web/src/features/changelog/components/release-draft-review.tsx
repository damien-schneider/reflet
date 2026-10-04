"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { toast } from "@ctrl-ui/react/ui/toast";
import { GithubLogo, Lightning } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { diffWordsWithSpace } from "diff";
import { useState } from "react";

interface ReleaseDraftReviewProps {
  currentDescription: string;
  currentTitle: string;
  onApply: () => void;
  releaseId: Id<"releases">;
}

export function ReleaseDraftReview({
  currentDescription,
  currentTitle,
  onApply,
  releaseId,
}: ReleaseDraftReviewProps) {
  const draft = useQuery(api.changelog.release_drafts.getPendingDraft, {
    releaseId,
  });
  const applyDraft = useMutation(api.changelog.release_drafts.applyDraft);
  const dismissDraft = useMutation(api.changelog.release_drafts.dismissDraft);
  const [isResolving, setIsResolving] = useState(false);

  if (!draft) {
    return null;
  }

  const resolveDraft = async (resolution: Promise<null>, failure: string) => {
    setIsResolving(true);
    try {
      await resolution;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failure);
    }
    setIsResolving(false);
  };

  const handleApply = () => {
    onApply();
    resolveDraft(
      applyDraft({ draftId: draft._id }),
      "Unable to apply the draft. Try again."
    );
  };

  const handleDismiss = () =>
    resolveDraft(
      dismissDraft({ draftId: draft._id }),
      "Unable to dismiss the draft. Try again."
    );

  const isFromGithub = draft.origin === "github";
  const proposedTitle = draft.title;

  return (
    <section
      aria-labelledby="release-draft-review-heading"
      className="mx-6 mt-4 space-y-3 rounded-lg border bg-muted/30 p-4"
    >
      <div className="flex items-start gap-2">
        {isFromGithub ? (
          <GithubLogo aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        ) : (
          <Lightning aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        )}
        <div className="space-y-0.5">
          <h3 className="font-medium text-sm" id="release-draft-review-heading">
            {isFromGithub
              ? "GitHub release notes changed"
              : "New AI draft ready"}
          </h3>
          <p className="text-pretty text-muted-foreground text-xs">
            Your text is unchanged. Apply to replace it with the proposed
            version, or dismiss to keep yours.
          </p>
        </div>
      </div>

      {proposedTitle !== undefined && proposedTitle !== currentTitle && (
        <TextDiff
          current={currentTitle}
          label="Title"
          proposed={proposedTitle}
        />
      )}
      <TextDiff
        current={currentDescription}
        label="Description"
        proposed={draft.description}
      />

      <div className="flex gap-2">
        <Button
          disabled={isResolving}
          onClick={handleApply}
          size="sm"
          tone="primary"
          type="button"
          variant="solid"
        >
          Apply
        </Button>
        <Button
          disabled={isResolving}
          onClick={handleDismiss}
          size="sm"
          type="button"
          variant="ghost"
        >
          Dismiss
        </Button>
      </div>
    </section>
  );
}

function TextDiff({
  current,
  label,
  proposed,
}: {
  current: string;
  label: string;
  proposed: string;
}) {
  let offset = 0;
  const parts = diffWordsWithSpace(current, proposed).map((change) => {
    const key = `${offset}-${change.added ? "added" : "kept"}`;
    offset += change.value.length;
    if (change.added) {
      return (
        <ins className="bg-success/15 text-success-text no-underline" key={key}>
          {change.value}
        </ins>
      );
    }
    if (change.removed) {
      return (
        <del className="bg-destructive/15 text-destructive-text" key={key}>
          {change.value}
        </del>
      );
    }
    return <span key={key}>{change.value}</span>;
  });

  return (
    <div className="space-y-1">
      <p className="font-medium text-muted-foreground text-xs">{label}</p>
      <p className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded border bg-background p-3 text-sm">
        {parts}
      </p>
    </div>
  );
}
