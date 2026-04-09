"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconBrandLinkedin,
  IconBrandReddit,
  IconBrandX,
  IconMessageCircle,
  IconNews,
  IconPencil,
  IconSearch,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentSheet } from "@/features/autopilot/components/content-sheet";
import {
  CONTENT_TYPES,
  PLATFORM_CONFIG,
  STATUS_COLOR_MAP,
  STATUS_LABELS,
} from "@/features/autopilot/lib/document-labels";
import { cn } from "@/lib/utils";

type DocumentType = Doc<"autopilotDocuments">["type"];
type ContentDoc = Doc<"autopilotDocuments">;
type StatusPreset = "all" | "draft" | "review" | "published";

const PLATFORM_ICONS: Record<string, typeof IconBrandReddit> = {
  reddit: IconBrandReddit,
  hn: IconNews,
  linkedin: IconBrandLinkedin,
  twitter: IconBrandX,
  pencil: IconPencil,
};

const PLATFORM_BG_COLORS: Record<string, string> = {
  reddit: "bg-orange-500",
  hn: "bg-orange-600",
  linkedin: "bg-blue-600",
  twitter: "bg-zinc-800",
  pencil: "bg-green-600",
};

const STATUS_DOT_COLORS = {
  draft: "bg-muted-foreground",
  pending_review: "bg-yellow-500",
  published: "bg-green-500",
  archived: "bg-red-500",
} as const;

const PLATFORMS = [
  { id: "all", label: "All" },
  { id: "reddit_reply", label: "Reddit", icon: "reddit" },
  { id: "hn_comment", label: "HN", icon: "hn" },
  { id: "linkedin_post", label: "LinkedIn", icon: "linkedin" },
  { id: "twitter_post", label: "X", icon: "twitter" },
  { id: "blog_post", label: "Blog", icon: "pencil" },
  { id: "changelog", label: "Changelog", icon: "pencil" },
] as const;

function getPlatformSubtitle(type: DocumentType): string {
  const conf = PLATFORM_CONFIG[type];
  if (!conf) {
    return "";
  }
  if (type === "blog_post") {
    return "Blog post";
  }
  if (type === "changelog") {
    return "Changelog entry";
  }
  return `Draft reply for ${conf.label}`;
}

export function ContentTab({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const documents = useQuery(api.autopilot.queries.documents.listDocuments, {
    organizationId,
    limit: 100,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusPreset, setStatusPreset] = useState<StatusPreset>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [selectedDocId, setSelectedDocId] =
    useState<Id<"autopilotDocuments"> | null>(null);

  if (documents === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton
              className="h-8 w-20 shrink-0 rounded-full"
              key={`pill-${String(i)}`}
            />
          ))}
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton
              className="h-16 w-full border-border border-b last:border-b-0"
              key={`skel-${String(i)}`}
            />
          ))}
        </div>
      </div>
    );
  }

  const contentDocs = documents.filter((doc) => CONTENT_TYPES.has(doc.type));

  const filteredDocs = contentDocs
    .filter((doc) => {
      if (platformFilter !== "all" && doc.type !== platformFilter) {
        return false;
      }
      if (
        searchQuery &&
        !doc.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (statusPreset === "draft" && doc.status !== "draft") {
        return false;
      }
      if (statusPreset === "review" && !doc.needsReview) {
        return false;
      }
      if (statusPreset === "published" && doc.status !== "published") {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.needsReview && !b.needsReview) {
        return -1;
      }
      if (!a.needsReview && b.needsReview) {
        return 1;
      }
      return (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt);
    });

  const getCount = (platformId: string) => {
    if (platformId === "all") {
      return contentDocs.length;
    }
    return contentDocs.filter((d) => d.type === platformId).length;
  };

  const sheetOpen = selectedDocId !== null;
  const selectedDoc = contentDocs.find((d) => d._id === selectedDocId) ?? null;

  const presets: Array<{ label: string; value: StatusPreset }> = [
    { label: "All", value: "all" },
    { label: "Drafts", value: "draft" },
    { label: "Review", value: "review" },
    { label: "Published", value: "published" },
  ];

  return (
    <div className="space-y-4">
      {/* Platform pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {PLATFORMS.map((platform) => {
          const isActive = platformFilter === platform.id;
          const count = getCount(platform.id);
          const iconKey = "icon" in platform ? platform.icon : undefined;
          const PlatformIcon = iconKey ? PLATFORM_ICONS[iconKey] : undefined;

          return (
            <button
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 font-medium text-xs transition-colors",
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
              key={platform.id}
              onClick={() => setPlatformFilter(platform.id)}
              type="button"
            >
              {PlatformIcon && <PlatformIcon className="size-3.5" />}
              {platform.label}
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 font-semibold text-[10px]",
                    isActive ? "bg-background/20" : "bg-muted text-foreground"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Status bar + search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-md border border-border">
          {presets.map((preset) => (
            <button
              className={cn(
                "px-3 py-1.5 font-medium text-xs transition-colors",
                statusPreset === preset.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                preset.value !== "all" && "border-border border-l"
              )}
              key={preset.value}
              onClick={() => setStatusPreset(preset.value)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs flex-1">
          <IconSearch className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search content..."
            value={searchQuery}
          />
        </div>

        <span className="ml-auto text-muted-foreground text-sm">
          {filteredDocs.length} item{filteredDocs.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Content list */}
      {filteredDocs.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-muted-foreground text-sm">
          <div className="text-center">
            <IconMessageCircle className="mx-auto mb-2 size-8" />
            <p>No content found</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {filteredDocs.map((doc) => (
            <ContentRow
              doc={doc}
              isSelected={selectedDocId === doc._id}
              key={doc._id}
              onClick={() => setSelectedDocId(doc._id)}
            />
          ))}
        </div>
      )}

      <ContentSheet
        document={selectedDoc}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDocId(null);
          }
        }}
        open={sheetOpen}
      />
    </div>
  );
}

function ContentRow({
  doc,
  isSelected,
  onClick,
}: {
  doc: ContentDoc;
  isSelected: boolean;
  onClick: () => void;
}) {
  const conf = PLATFORM_CONFIG[doc.type];
  const iconKey = conf?.icon ?? "pencil";
  const PlatformIcon = PLATFORM_ICONS[iconKey] ?? IconPencil;
  const bgColor = PLATFORM_BG_COLORS[iconKey] ?? "bg-muted";
  const timeAgo = formatDistanceToNow(doc.updatedAt ?? doc.createdAt, {
    addSuffix: true,
  });
  const subtitle = getPlatformSubtitle(doc.type);
  const preview = doc.content
    .slice(0, 120)
    .replace(/[#*_`>]/g, "")
    .trim();

  return (
    <button
      className={cn(
        "flex w-full items-start gap-3 border-border border-b px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/50",
        isSelected && "bg-muted",
        doc.needsReview && "bg-blue-500/5"
      )}
      onClick={onClick}
      type="button"
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          bgColor
        )}
      >
        <PlatformIcon className="size-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-sm">{doc.title}</span>
          <span className="shrink-0 text-muted-foreground text-xs">
            {timeAgo}
          </span>
        </div>
        <span className="text-muted-foreground text-xs">{subtitle}</span>
        {preview && (
          <p className="mt-0.5 truncate text-muted-foreground text-xs">
            {preview}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge
          className="text-[10px]"
          color={STATUS_COLOR_MAP[doc.status]}
          variant="outline"
        >
          {STATUS_LABELS[doc.status]}
        </Badge>
        {doc.needsReview && (
          <span
            className="size-2 rounded-full bg-blue-500"
            title="Needs review"
          />
        )}
        <span
          className={cn("size-2 rounded-full", STATUS_DOT_COLORS[doc.status])}
        />
      </div>
    </button>
  );
}
