"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { Streamdown } from "streamdown";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";
import { ReleaseCommitsList } from "./release-commits-list";
import { ReleaseFeedbackSection } from "./release-feedback-section";

interface ReleaseEditorBodyProps {
  commits: Parameters<typeof ReleaseCommitsList>[0]["commits"];
  description: string;
  files: Parameters<typeof ReleaseCommitsList>[0]["files"];
  isStreaming: boolean;
  isSubmitting: boolean;
  onDescriptionChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  organizationId: Id<"organizations">;
  previousTag: Parameters<typeof ReleaseCommitsList>[0]["previousTag"];
  releaseId: Id<"releases"> | null;
  setFeedbackLinkStatus: Parameters<
    typeof ReleaseFeedbackSection
  >[0]["onLinkStatusChange"];
  shouldAutoMatchFeedback: boolean;
  streamedContent: string;
  title: string;
}

export function ReleaseEditorBody({
  commits,
  description,
  files,
  isStreaming,
  isSubmitting,
  onDescriptionChange,
  onTitleChange,
  organizationId,
  previousTag,
  releaseId,
  setFeedbackLinkStatus,
  shouldAutoMatchFeedback,
  streamedContent,
  title,
}: ReleaseEditorBodyProps) {
  return (
    <>
      {/* Title area */}
      <div className="px-6 pt-4 pb-2">
        <TiptapTitleEditor
          autoFocus
          disabled={isSubmitting || isStreaming}
          onChange={onTitleChange}
          placeholder="What's New in v1.0"
          value={title}
        />
      </div>

      {/* Divider */}
      <div className="mx-6 border-border/50 border-b" />

      {/* Description area - takes up remaining space */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isStreaming ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Streamdown caret="block" isAnimating mode="streaming">
              {streamedContent}
            </Streamdown>
          </div>
        ) : (
          <TiptapMarkdownEditor
            disabled={isSubmitting}
            minimal
            onChange={onDescriptionChange}
            placeholder="Describe what's new in this release... Type '/' for commands, or drag and drop images/videos"
            value={description}
          />
        )}
      </div>

      {/* Commits collapsible */}
      {commits.length > 0 && (
        <ReleaseCommitsList
          commits={commits}
          files={files}
          previousTag={previousTag}
        />
      )}

      {/* Feedback linking section */}
      <div className="border-t px-6 py-4">
        <ReleaseFeedbackSection
          autoTriggerMatching={shouldAutoMatchFeedback}
          commits={commits}
          description={description}
          onLinkStatusChange={setFeedbackLinkStatus}
          organizationId={organizationId}
          releaseId={releaseId}
        />
      </div>
    </>
  );
}
