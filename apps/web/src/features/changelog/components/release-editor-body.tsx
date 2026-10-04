"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { Streamdown } from "streamdown";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";
import type { FeedbackLinkStatus } from "./feedback-section-header";
import { ReleaseCommitsList } from "./release-commits-list";
import { ReleaseDraftReview } from "./release-draft-review";
import { ReleaseFeedbackSection } from "./release-feedback-section";

interface ReleaseEditorBodyProps {
  description: string;
  generatedPreview: string | null;
  isSubmitting: boolean;
  onApplyDraft: () => void;
  onDescriptionChange: (value: string) => void;
  onFeedbackLinkStatusChange: (status: FeedbackLinkStatus) => void;
  onTitleChange: (value: string) => void;
  organizationId: Id<"organizations">;
  releaseId: Id<"releases"> | null;
  shouldAutoMatchFeedback: boolean;
  title: string;
}

export function ReleaseEditorBody({
  description,
  generatedPreview,
  isSubmitting,
  onApplyDraft,
  onDescriptionChange,
  onFeedbackLinkStatusChange,
  onTitleChange,
  organizationId,
  releaseId,
  shouldAutoMatchFeedback,
  title,
}: ReleaseEditorBodyProps) {
  const isGenerating = generatedPreview !== null;

  return (
    <>
      {releaseId && (
        <ReleaseDraftReview
          currentDescription={description}
          currentTitle={title}
          onApply={onApplyDraft}
          releaseId={releaseId}
        />
      )}

      <div className="px-6 pt-4 pb-2">
        <TiptapTitleEditor
          autoFocus
          disabled={isSubmitting || isGenerating}
          onChange={onTitleChange}
          placeholder="What’s new in v1.0"
          value={title}
        />
      </div>

      <div className="mx-6 border-border/50 border-b" />

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isGenerating ? (
          <div
            aria-busy="true"
            className="prose prose-sm dark:prose-invert max-w-none"
          >
            <Streamdown caret="block" isAnimating mode="streaming">
              {generatedPreview}
            </Streamdown>
          </div>
        ) : (
          <TiptapMarkdownEditor
            disabled={isSubmitting}
            minimal
            onChange={onDescriptionChange}
            placeholder="Describe what’s new. Type / for blocks, or drop images and videos here."
            value={description}
          />
        )}
      </div>

      {releaseId && <ReleaseCommitsList releaseId={releaseId} />}

      <div className="border-t px-6 py-4">
        <ReleaseFeedbackSection
          autoTriggerMatching={shouldAutoMatchFeedback}
          description={description}
          onLinkStatusChange={onFeedbackLinkStatusChange}
          organizationId={organizationId}
          releaseId={releaseId}
        />
      </div>
    </>
  );
}
