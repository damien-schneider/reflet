"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  ComposerIcon,
  InlineFeedbackForm,
  type InlineFeedbackTag,
} from "./inline-feedback-form";
import {
  useComposerExpansion,
  useInlineFeedbackForm,
} from "./use-inline-feedback-composer";

export interface InlineSubmitData {
  attachments: string[];
  description: string;
  email: string;
  tagId?: Id<"tags">;
  title: string;
}

interface InlineFeedbackInputProps {
  isAdmin?: boolean;
  isMember: boolean;
  onSubmit: (data: InlineSubmitData) => Promise<void>;
  ref?: React.Ref<InlineFeedbackInputHandle>;
  tags?: InlineFeedbackTag[];
}

export interface InlineFeedbackInputHandle {
  focus: () => void;
  scrollIntoView: () => void;
}

function CollapsedComposerButton({
  buttonRef,
  onOpen,
}: {
  buttonRef: React.Ref<HTMLButtonElement>;
  onOpen: () => void;
}) {
  return (
    <button
      className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onOpen}
      ref={buttonRef}
      type="button"
    >
      <ComposerIcon />
      <span className="text-muted-foreground text-sm">
        Share an idea or suggestion…
      </span>
    </button>
  );
}

export function InlineFeedbackInput({
  isMember,
  isAdmin,
  onSubmit,
  tags,
  ref,
}: InlineFeedbackInputProps) {
  const {
    collapse,
    containerRef,
    expandAndFocus,
    inputRef,
    isExpanded,
    openButtonRef,
  } = useComposerExpansion(ref);
  const composer = useInlineFeedbackForm({ collapse, onSubmit });

  return (
    <div ref={containerRef}>
      <div
        className={cn(
          "rounded-xl border bg-card transition-[border-color,box-shadow] duration-(--duration-fast)",
          isExpanded
            ? "border-border shadow-sm focus-within:border-ring"
            : "border-border/50 border-dashed hover:border-border hover:bg-accent/30"
        )}
      >
        {isExpanded ? (
          <InlineFeedbackForm
            composer={composer}
            inputRef={inputRef}
            isMember={isMember}
            onCollapse={collapse}
            tagOptions={isAdmin ? tags : undefined}
          />
        ) : (
          <CollapsedComposerButton
            buttonRef={openButtonRef}
            onOpen={expandAndFocus}
          />
        )}
      </div>

      <p
        className="mt-2 text-center text-muted-foreground text-xs empty:hidden"
        role="status"
      >
        {composer.confirmation}
      </p>
    </div>
  );
}
