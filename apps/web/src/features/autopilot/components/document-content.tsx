"use client";

import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconBrandLinkedin,
  IconBrandReddit,
  IconBrandX,
  IconCopy,
  IconExternalLink,
  IconNews,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { cn } from "@/lib/utils";

type DocumentType = Doc<"autopilotDocuments">["type"];

export const SOCIAL_TYPES = new Set<DocumentType>([
  "reddit_reply",
  "hn_comment",
  "linkedin_post",
  "twitter_post",
]);

export const RESEARCH_TYPES = new Set<DocumentType>([
  "market_research",
  "battlecard",
]);

const SOCIAL_ICONS: Partial<Record<DocumentType, typeof IconBrandReddit>> = {
  reddit_reply: IconBrandReddit,
  hn_comment: IconNews,
  linkedin_post: IconBrandLinkedin,
  twitter_post: IconBrandX,
};

const PLATFORM_LABELS: Record<string, string> = {
  "reddit.com": "Reddit",
  "news.ycombinator.com": "Hacker News",
  "linkedin.com": "LinkedIn",
  "twitter.com": "X (Twitter)",
  "x.com": "X (Twitter)",
  "github.com": "GitHub",
  "producthunt.com": "Product Hunt",
};

function formatSourceLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    return PLATFORM_LABELS[hostname] ?? hostname;
  } catch {
    return url;
  }
}

export function SourceLink({ url }: { url: string }) {
  const label = formatSourceLabel(url);
  return (
    <a
      className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-foreground text-xs transition-colors hover:bg-muted"
      href={url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <IconExternalLink className="size-3 shrink-0 text-muted-foreground" />
      {label}
    </a>
  );
}

export function DocumentContent({
  document,
  editedContent,
  isEditable,
  onContentChange,
}: {
  document: Doc<"autopilotDocuments">;
  editedContent: string | null;
  isEditable: boolean;
  onContentChange?: (value: string) => void;
}) {
  if (SOCIAL_TYPES.has(document.type)) {
    return (
      <SocialDraftContent
        content={editedContent ?? document.content}
        isEditable={isEditable}
        onContentChange={onContentChange}
        targetUrl={document.targetUrl}
        type={document.type}
      />
    );
  }

  if (RESEARCH_TYPES.has(document.type)) {
    return (
      <ResearchContent
        content={editedContent ?? document.content}
        isEditable={isEditable}
        keyFindings={document.keyFindings}
        onContentChange={onContentChange}
        relevanceScore={document.relevanceScore}
        sourceUrls={document.sourceUrls}
      />
    );
  }

  return (
    <TiptapMarkdownEditor
      editable={isEditable}
      minimal={!isEditable}
      onChange={onContentChange}
      placeholder={isEditable ? "Edit content before approving..." : undefined}
      value={editedContent ?? document.content}
    />
  );
}

function SocialDraftContent({
  content,
  isEditable,
  onContentChange,
  targetUrl,
  type,
}: {
  content: string;
  isEditable: boolean;
  onContentChange?: (value: string) => void;
  targetUrl?: string;
  type: DocumentType;
}) {
  const PlatformIcon = SOCIAL_ICONS[type] ?? IconExternalLink;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-3">
      {targetUrl && (
        <a
          className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm transition-colors hover:bg-muted/60"
          href={targetUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <PlatformIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            {targetUrl}
          </span>
          <IconExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
        </a>
      )}

      <div className="rounded-lg border-2 border-primary/30 border-dashed p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Draft Reply
          </span>
          <div className="flex gap-1">
            <Button onClick={handleCopy} size="icon-sm" variant="ghost">
              <IconCopy className="size-3.5" />
            </Button>
            {targetUrl && (
              <a
                className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-3 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                href={targetUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <PlatformIcon className="mr-1 size-3.5" />
                Open & Reply
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
      </div>
    </div>
  );
}

function ResearchContent({
  content,
  isEditable,
  keyFindings,
  onContentChange,
  relevanceScore,
  sourceUrls,
}: {
  content: string;
  isEditable: boolean;
  keyFindings?: string[];
  onContentChange?: (value: string) => void;
  relevanceScore?: number;
  sourceUrls?: string[];
}) {
  return (
    <div className="space-y-4">
      {relevanceScore !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Relevance</span>
          <RelevanceScoreBadge score={relevanceScore} />
        </div>
      )}

      {keyFindings && keyFindings.length > 0 && (
        <div>
          <span className="font-medium text-xs uppercase tracking-wider">
            Key Findings
          </span>
          <ul className="mt-2 space-y-1.5">
            {keyFindings.map((finding) => (
              <li className="flex items-start gap-2 text-sm" key={finding}>
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                {finding}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sourceUrls && sourceUrls.length > 0 && (
        <div>
          <span className="font-medium text-xs uppercase tracking-wider">
            Sources
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sourceUrls.map((url) => (
              <SourceLink key={url} url={url} />
            ))}
          </div>
        </div>
      )}

      <Separator />

      <TiptapMarkdownEditor
        editable={isEditable}
        minimal={!isEditable}
        onChange={onContentChange}
        placeholder={
          isEditable ? "Edit content before approving..." : undefined
        }
        value={content}
      />
    </div>
  );
}

const HIGH_THRESHOLD = 8;
const MED_THRESHOLD = 5;

function getScoreColor(score: number): string {
  if (score >= HIGH_THRESHOLD) {
    return "bg-green-500 text-white";
  }
  if (score >= MED_THRESHOLD) {
    return "bg-amber-500 text-white";
  }
  return "bg-muted text-muted-foreground";
}

function RelevanceScoreBadge({ score }: { score: number }) {
  const color = getScoreColor(score);

  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full font-bold text-xs",
        color
      )}
    >
      {score}
    </span>
  );
}
