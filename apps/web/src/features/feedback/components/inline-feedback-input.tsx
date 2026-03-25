"use client";

import { ArrowRight, Lightning, X } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { AnimatePresence, domAnimation, LazyMotion, m } from "motion/react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { getTagSwatchClass } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";
import { AttachmentUpload } from "./attachment-upload";

const MAX_TITLE_LENGTH = 100;
const TITLE_COUNTER_THRESHOLD = 90;

interface Tag {
  _id: string;
  color: string;
  icon?: string;
  name: string;
}

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
  tags?: Tag[];
}

export interface InlineFeedbackInputHandle {
  focus: () => void;
  scrollIntoView: () => void;
}

const INITIAL_STATE = {
  title: "",
  description: "",
  email: "",
  attachments: [] as string[],
  tagId: undefined as Id<"tags"> | undefined,
};

export const InlineFeedbackInput = forwardRef<
  InlineFeedbackInputHandle,
  InlineFeedbackInputProps
>(function InlineFeedbackInput({ isMember, isAdmin, onSubmit, tags }, ref) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [form, setForm] = useState(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      setIsExpanded(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    scrollIntoView: () => {
      containerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setIsExpanded(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
  }));

  const trimmedTitle = form.title.trim();
  const titleLength = form.title.length;
  const isTitleOverLimit = titleLength > MAX_TITLE_LENGTH;
  const showTitleCounter = titleLength >= TITLE_COUNTER_THRESHOLD;
  const canSubmit =
    !isSubmitting && trimmedTitle.length > 0 && !isTitleOverLimit;

  const hasContent =
    form.title ||
    form.description ||
    form.email ||
    form.attachments.length > 0 ||
    form.tagId;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: trimmedTitle,
        description: form.description.trim(),
        email: form.email.trim(),
        attachments: form.attachments,
        tagId: form.tagId,
      });
      setForm(INITIAL_STATE);
      setIsExpanded(false);
      setJustSubmitted(true);
      setTimeout(() => setJustSubmitted(false), 1500);
    } catch {
      // Error is handled by the parent (Convex client shows it)
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, onSubmit, trimmedTitle, form]);

  const handleCancel = useCallback(() => {
    setForm(INITIAL_STATE);
    setIsExpanded(false);
  }, []);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !form.description) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === "Escape" && !hasContent) {
        setIsExpanded(false);
        inputRef.current?.blur();
      }
    },
    [handleSubmit, hasContent, form.description]
  );

  const handleGhostClick = useCallback(() => {
    setIsExpanded(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const showTagSelector = isAdmin && tags && tags.length > 0;

  return (
    <LazyMotion features={domAnimation}>
      <div ref={containerRef}>
        <div
          className={cn(
            "rounded-xl border bg-card transition-[border-color,box-shadow] duration-200",
            isExpanded
              ? "border-border shadow-sm"
              : "cursor-pointer border-border/50 border-dashed hover:border-border hover:bg-accent/30",
            justSubmitted && "border-primary"
          )}
        >
          {isExpanded ? (
            // Expanded state
            <div className="relative px-3 py-3">
              {/* Close button — top right */}
              <Button
                className="absolute top-2 right-2 h-7 w-7"
                disabled={isSubmitting}
                onClick={handleCancel}
                size="icon"
                variant="ghost"
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Cancel</span>
              </Button>

              {/* Title row */}
              <div className="flex items-center gap-3 pr-8">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Lightning className="h-4 w-4" weight="fill" />
                </div>
                <Input
                  className="h-9 flex-1 border-0 bg-transparent px-0 font-medium text-sm shadow-none focus-visible:ring-0"
                  disabled={isSubmitting}
                  maxLength={MAX_TITLE_LENGTH + 10}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  onKeyDown={handleTitleKeyDown}
                  placeholder="What would you improve?"
                  ref={inputRef}
                  value={form.title}
                />
              </div>

              {/* Character counter */}
              <AnimatePresence>
                {showTitleCounter && (
                  <m.p
                    animate={{ opacity: 1, height: "auto" }}
                    className={cn(
                      "mt-1 text-right text-xs tabular-nums",
                      isTitleOverLimit
                        ? "text-destructive"
                        : "text-muted-foreground"
                    )}
                    exit={{ opacity: 0, height: 0 }}
                    initial={{ opacity: 0, height: 0 }}
                  >
                    {titleLength}/{MAX_TITLE_LENGTH}
                  </m.p>
                )}
              </AnimatePresence>

              {/* Divider */}
              <div className="mt-2 border-border/40 border-b" />

              {/* Description */}
              <div className="mt-2">
                <TiptapMarkdownEditor
                  minimal
                  onChange={(value) =>
                    setForm((f) => ({ ...f, description: value }))
                  }
                  onSubmit={handleSubmit}
                  placeholder="Add a description... (optional)"
                  value={form.description}
                />
              </div>

              {/* Attachments */}
              <div className="mt-2">
                <AttachmentUpload
                  attachments={form.attachments}
                  disabled={isSubmitting}
                  onAttachmentsChange={(attachments) =>
                    setForm((f) => ({ ...f, attachments }))
                  }
                />
              </div>

              {/* Email for non-members */}
              <AnimatePresence>
                {!isMember && (
                  <m.div
                    animate={{ opacity: 1, height: "auto" }}
                    className="overflow-hidden"
                    exit={{ opacity: 0, height: 0 }}
                    initial={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mt-2">
                      <Input
                        className="h-8 text-sm"
                        disabled={isSubmitting}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, email: e.target.value }))
                        }
                        placeholder="Email for updates (optional)"
                        type="email"
                        value={form.email}
                      />
                    </div>
                  </m.div>
                )}
              </AnimatePresence>

              {/* Footer: tag selector + submit */}
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {showTagSelector && (
                    <Select
                      onValueChange={(value) =>
                        setForm((f) => ({
                          ...f,
                          tagId:
                            value && value !== "none"
                              ? (value as Id<"tags">)
                              : undefined,
                        }))
                      }
                      value={form.tagId ?? "none"}
                    >
                      <SelectTrigger className="h-7 w-auto min-w-28 max-w-44 text-xs">
                        <SelectValue placeholder="Tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No tag</SelectItem>
                        {tags.map((tag) => (
                          <SelectItem key={tag._id} value={tag._id}>
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "h-2.5 w-2.5 shrink-0 rounded-sm border",
                                  getTagSwatchClass(tag.color)
                                )}
                              />
                              {tag.icon && <span>{tag.icon}</span>}
                              {tag.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Button disabled={!canSubmit} onClick={handleSubmit} size="sm">
                  <ArrowRight className="mr-1 h-3 w-3" />
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </div>
          ) : (
            // Ghost state
            <button
              className="flex w-full items-center gap-3 px-4 py-4 text-left"
              onClick={handleGhostClick}
              type="button"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Lightning className="h-4 w-4" weight="fill" />
              </div>
              <span className="text-muted-foreground text-sm">
                Share an idea or suggestion...
              </span>
            </button>
          )}
        </div>

        {/* Success flash */}
        <AnimatePresence>
          {justSubmitted && (
            <m.p
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-center text-primary text-xs"
              exit={{ opacity: 0, y: -4 }}
              initial={{ opacity: 0, y: 4 }}
            >
              Feedback submitted!
            </m.p>
          )}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
});
