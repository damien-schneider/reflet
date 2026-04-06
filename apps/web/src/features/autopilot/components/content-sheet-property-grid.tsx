import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  AGENT_LABELS,
  PLATFORM_CONFIG,
  STATUS_COLOR_MAP,
  STATUS_LABELS,
  TYPE_LABELS,
} from "@/features/autopilot/lib/document-labels";

function PropertyRow({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-24 shrink-0 text-muted-foreground text-xs">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">{children}</div>
    </div>
  );
}

export function ContentPropertyGrid({
  document,
}: {
  document: Doc<"autopilotDocuments">;
}) {
  return (
    <div className="text-sm">
      <PropertyRow label="Platform">
        <span>
          {PLATFORM_CONFIG[document.type]?.label ?? TYPE_LABELS[document.type]}
        </span>
      </PropertyRow>

      {document.sourceAgent && (
        <PropertyRow label="Agent">
          <Badge variant="secondary">
            {AGENT_LABELS[document.sourceAgent] ?? document.sourceAgent}
          </Badge>
        </PropertyRow>
      )}

      <PropertyRow label="Status">
        <Badge color={STATUS_COLOR_MAP[document.status]}>
          {STATUS_LABELS[document.status]}
        </Badge>
      </PropertyRow>

      {document.targetUrl && (
        <PropertyRow label="Target URL">
          <a
            className="truncate text-primary hover:underline"
            href={document.targetUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {document.targetUrl}
          </a>
        </PropertyRow>
      )}

      {document.publishedUrl && (
        <PropertyRow label="Published URL">
          <a
            className="truncate text-primary hover:underline"
            href={document.publishedUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {document.publishedUrl}
          </a>
        </PropertyRow>
      )}

      {document.tags.length > 0 && (
        <PropertyRow label="Tags">
          <div className="flex flex-wrap gap-1">
            {document.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </PropertyRow>
      )}

      <PropertyRow label="Created">
        <span>
          {formatDistanceToNow(document.createdAt, { addSuffix: true })}
        </span>
      </PropertyRow>

      {document.updatedAt && (
        <PropertyRow label="Updated">
          <span>
            {formatDistanceToNow(document.updatedAt, { addSuffix: true })}
          </span>
        </PropertyRow>
      )}
    </div>
  );
}
