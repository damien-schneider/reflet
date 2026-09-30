"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import { ArrowSquareOut, Trash } from "@phosphor-icons/react";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { TagBadge } from "@/components/tag-badge";

const SUMMARY_MAX_LENGTH = 200;
const WWW_PREFIX = /^www\./;

const truncate = (text: string): string =>
  text.length > SUMMARY_MAX_LENGTH
    ? `${text.slice(0, SUMMARY_MAX_LENGTH)}…`
    : text;

const parseAiProfileSummary = (aiProfile: string): string => {
  try {
    const parsed = JSON.parse(aiProfile);
    const summary =
      typeof parsed === "object" && parsed !== null
        ? (parsed.summary ?? parsed.description ?? JSON.stringify(parsed))
        : String(parsed);
    return truncate(summary);
  } catch {
    return truncate(aiProfile);
  }
};

const getDisplayUrl = (url: string): string => {
  try {
    return new URL(url).hostname.replace(WWW_PREFIX, "");
  } catch {
    return url;
  }
};

interface CompetitorCardProps {
  competitor: {
    _id: string;
    name: string;
    websiteUrl: string;
    description?: string;
    status: string;
    aiProfile?: string;
    lastScrapedAt?: number;
    featureList?: string[];
  };
  onRemove: () => void;
  orgSlug: string;
}

export function CompetitorCard({ competitor, onRemove }: CompetitorCardProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const statusLabel =
    competitor.status.charAt(0).toUpperCase() + competitor.status.slice(1);
  const featureCount = competitor.featureList?.length ?? 0;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <CardTitle className="truncate">{competitor.name}</CardTitle>
              <TagBadge
                color={competitor.status === "active" ? "green" : "gray"}
                size="sm"
              >
                {statusLabel}
              </TagBadge>
            </div>
            <a
              className="inline-flex min-w-0 items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
              href={competitor.websiteUrl}
              rel="noopener"
              target="_blank"
              title={competitor.websiteUrl}
            >
              <span className="truncate">
                {getDisplayUrl(competitor.websiteUrl)}
              </span>
              <ArrowSquareOut aria-hidden className="size-3.5 shrink-0" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
          {featureCount > 0 ? (
            <Badge
              className="shrink-0 tabular-nums"
              size="sm"
              variant="outline"
            >
              {featureCount} feature{featureCount === 1 ? "" : "s"}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {competitor.description ? (
          <p className="text-pretty text-muted-foreground text-sm">
            {competitor.description}
          </p>
        ) : null}
        {competitor.aiProfile ? (
          <div className="rounded-md bg-muted/50 p-3">
            <p className="font-medium text-muted-foreground text-xs">
              AI Profile
            </p>
            <p className="mt-1 text-pretty text-sm">
              {parseAiProfileSummary(competitor.aiProfile)}
            </p>
          </div>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
          {competitor.lastScrapedAt ? (
            <time
              className="text-muted-foreground text-xs tabular-nums"
              dateTime={new Date(competitor.lastScrapedAt).toISOString()}
              title={format(competitor.lastScrapedAt, "PPpp")}
            >
              Scanned{" "}
              {formatDistanceToNow(competitor.lastScrapedAt, {
                addSuffix: true,
              })}
            </time>
          ) : (
            <span className="text-muted-foreground text-xs">
              Not scanned yet
            </span>
          )}
          {confirmingRemove ? (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setConfirmingRemove(false)}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onRemove();
                  setConfirmingRemove(false);
                }}
                size="sm"
                tone="danger"
                variant="surface"
              >
                <Trash data-icon="inline-start" />
                Remove competitor
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setConfirmingRemove(true)}
              size="sm"
              variant="ghost"
            >
              <Trash data-icon="inline-start" />
              Remove
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
