"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { cn } from "@/lib/utils";

type ChainNodeKind =
  | "codebase_understanding"
  | "identity"
  | "brand_voice"
  | "feature_catalog"
  | "scope"
  | "market_analysis"
  | "target_definition"
  | "personas"
  | "use_cases"
  | "lead_targets"
  | "community_posts"
  | "drafts";

interface ChainNodePreviewDialogProps {
  kind: ChainNodeKind | null;
  label: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
  statusLabel: string;
}

const ROUTE_BY_KIND: Record<ChainNodeKind, (orgSlug: string) => string> = {
  codebase_understanding: (slug) => `/dashboard/${slug}/autopilot/knowledge`,
  identity: (slug) => `/dashboard/${slug}/autopilot/knowledge`,
  brand_voice: (slug) => `/dashboard/${slug}/autopilot/knowledge`,
  feature_catalog: (slug) => `/dashboard/${slug}/autopilot/knowledge`,
  scope: (slug) => `/dashboard/${slug}/autopilot/knowledge`,
  market_analysis: (slug) => `/dashboard/${slug}/autopilot/documents`,
  target_definition: (slug) => `/dashboard/${slug}/autopilot/documents`,
  personas: (slug) => `/dashboard/${slug}/autopilot/sales`,
  use_cases: (slug) => `/dashboard/${slug}/autopilot/growth`,
  lead_targets: (slug) => `/dashboard/${slug}/autopilot/sales`,
  community_posts: (slug) => `/dashboard/${slug}/autopilot/growth`,
  drafts: (slug) => `/dashboard/${slug}/autopilot/content`,
};

const ROUTE_LABEL_BY_KIND: Record<ChainNodeKind, string> = {
  codebase_understanding: "Open Knowledge",
  identity: "Open Knowledge",
  brand_voice: "Open Knowledge",
  feature_catalog: "Open Knowledge",
  scope: "Open Knowledge",
  market_analysis: "Open Documents",
  target_definition: "Open Documents",
  personas: "Open Sales",
  use_cases: "Open Growth",
  lead_targets: "Open Sales",
  community_posts: "Open Growth",
  drafts: "Open Content",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

export function ChainNodePreviewDialog({
  kind,
  label,
  onOpenChange,
  open,
  organizationId,
  orgSlug,
  statusLabel,
}: ChainNodePreviewDialogProps) {
  const detail = useQuery(
    api.autopilot.queries.chain.getChainNodeDetail,
    kind ? { organizationId, kind } : "skip"
  );

  const routeFn = kind ? ROUTE_BY_KIND[kind] : null;
  const routeLabel = kind ? ROUTE_LABEL_BY_KIND[kind] : "";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base">{label}</DialogTitle>
            <Badge variant="gray">{statusLabel}</Badge>
          </div>
          {detail?.lastUpdatedAt && (
            <DialogDescription>
              Updated {DATE_FORMATTER.format(detail.lastUpdatedAt)}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {detail === undefined && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          )}

          {detail?.markdown && (
            <TiptapMarkdownEditor
              className="prose-sm text-foreground/80"
              editable={false}
              value={detail.markdown}
            />
          )}

          {detail && !detail.markdown && detail.items.length > 0 && (
            <ul className="space-y-2">
              {detail.items.map((item) => (
                <li
                  className="rounded-md border bg-card p-2.5"
                  key={`${item.title}-${item.updatedAt}`}
                >
                  <div className="font-medium text-sm">{item.title}</div>
                  {item.summary && (
                    <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                      {item.summary}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {detail && !detail.markdown && detail.items.length === 0 && (
            <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
              No content yet. The autopilot will generate this once upstream
              dependencies are published.
            </div>
          )}
        </div>

        <DialogFooter>
          {routeFn && (
            <Link
              className={cn(
                "inline-flex h-8 items-center justify-center rounded-md border bg-background px-3 font-medium text-xs",
                "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              )}
              href={routeFn(orgSlug)}
            >
              {routeLabel}
            </Link>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
