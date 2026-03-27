"use client";

import { ArrowSquareOut, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d ago`;
  }
  if (diffHours > 0) {
    return `${diffHours}h ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  }
  return "just now";
};

const parseAiProfileSummary = (aiProfile: string): string => {
  try {
    const parsed = JSON.parse(aiProfile);
    const summary =
      typeof parsed === "object" && parsed !== null
        ? (parsed.summary ?? parsed.description ?? JSON.stringify(parsed))
        : String(parsed);
    return summary.length > 200 ? `${summary.slice(0, 200)}...` : summary;
  } catch {
    return aiProfile.length > 200 ? `${aiProfile.slice(0, 200)}...` : aiProfile;
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

  const statusVariant = competitor.status === "active" ? "green" : "gray";
  const statusLabel =
    competitor.status.charAt(0).toUpperCase() + competitor.status.slice(1);

  const handleRemoveClick = () => {
    if (confirmingRemove) {
      onRemove();
      setConfirmingRemove(false);
    } else {
      setConfirmingRemove(true);
    }
  };

  const handleCancelRemove = () => {
    setConfirmingRemove(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <CardTitle>{competitor.name}</CardTitle>
              <Badge color={statusVariant}>{statusLabel}</Badge>
              {competitor.featureList && competitor.featureList.length > 0 && (
                <Badge variant="outline">
                  {competitor.featureList.length} feature
                  {competitor.featureList.length === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
            <a
              className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
              href={competitor.websiteUrl}
              rel="noopener"
              target="_blank"
            >
              {competitor.websiteUrl}
              <ArrowSquareOut className="size-3.5" />
            </a>
          </div>
          {competitor.lastScrapedAt && (
            <span className="shrink-0 text-muted-foreground text-xs">
              Scanned {formatRelativeTime(competitor.lastScrapedAt)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {competitor.description && (
          <p className="text-muted-foreground text-sm">
            {competitor.description}
          </p>
        )}
        {competitor.aiProfile && (
          <div className="mt-2 rounded-md bg-muted/50 p-3">
            <p className="font-medium text-muted-foreground text-xs">
              AI Profile
            </p>
            <p className="mt-1 text-sm">
              {parseAiProfileSummary(competitor.aiProfile)}
            </p>
          </div>
        )}
        <div className="mt-3 flex items-center gap-2">
          {confirmingRemove ? (
            <>
              <Button
                onClick={handleRemoveClick}
                size="sm"
                variant="destructive"
              >
                <Trash data-icon="inline-start" />
                Confirm Remove
              </Button>
              <Button onClick={handleCancelRemove} size="sm" variant="ghost">
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={handleRemoveClick} size="sm" variant="ghost">
              <Trash data-icon="inline-start" />
              Remove
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
