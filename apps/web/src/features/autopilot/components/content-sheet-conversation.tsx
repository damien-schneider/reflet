"use client";

import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import {
  type IconBrandReddit,
  IconCheck,
  IconCopy,
  IconExternalLink,
} from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import {
  PLATFORM_CONFIG,
  TYPE_LABELS,
} from "@/features/autopilot/lib/document-labels";

type DocumentType = Doc<"autopilotDocuments">["type"];

export function ConversationContent({
  content,
  isEditable,
  onContentChange,
  platformIcon: PlatformIcon,
  targetUrl,
  type,
}: {
  content: string;
  isEditable: boolean;
  onContentChange?: (value: string) => void;
  platformIcon: typeof IconBrandReddit;
  targetUrl?: string;
  type: DocumentType;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Received bubble — the original post being replied to */}
      {targetUrl && (
        <div className="max-w-[85%]">
          <a
            className="block rounded-lg bg-muted p-3 transition-colors hover:bg-muted/80"
            href={targetUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="mb-1 flex items-center gap-1.5">
              <PlatformIcon className="size-3.5 text-muted-foreground" />
              <span className="font-medium text-muted-foreground text-xs">
                {PLATFORM_CONFIG[type]?.label ?? TYPE_LABELS[type]}
              </span>
            </div>
            <p className="truncate text-foreground text-sm">{targetUrl}</p>
            <span className="mt-1 flex items-center gap-1 text-muted-foreground text-xs">
              View original
              <IconExternalLink className="size-3" />
            </span>
          </a>
        </div>
      )}

      {/* Sent bubble — our draft reply */}
      <div className="ml-auto max-w-[90%]">
        <div className="rounded-lg border-2 border-primary/30 border-dashed p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Your Draft
            </span>
            <div className="flex items-center gap-1">
              <Button onClick={handleCopy} size="icon-sm" variant="ghost">
                {copied ? (
                  <IconCheck className="size-3.5 text-green-500" />
                ) : (
                  <IconCopy className="size-3.5" />
                )}
              </Button>
              {targetUrl && (
                <a
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-input bg-background px-2.5 font-medium text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                  href={targetUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <PlatformIcon className="size-3" />
                  Reply
                </a>
              )}
            </div>
          </div>
          <TiptapMarkdownEditor
            editable={isEditable}
            minimal={!isEditable}
            onChange={onContentChange}
            placeholder={
              isEditable ? "Edit your reply before posting..." : undefined
            }
            value={content}
          />
          <p className="mt-2 text-right text-muted-foreground text-xs">
            {content.length} chars
          </p>
        </div>
      </div>
    </div>
  );
}
