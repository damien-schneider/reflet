"use client";

import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { IconExternalLink } from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { type ReactNode, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const BULLET_PREFIX_RE = /^[-•]\s*/;

const MOVES_VISIBLE_DEFAULT = 10;

function getScoreColor(score: number): "red" | "yellow" | "default" {
  if (score >= 7) {
    return "red";
  }
  if (score >= 4) {
    return "yellow";
  }
  return "default";
}

interface CompetitorSheetProps {
  competitor: Doc<"autopilotCompetitors"> | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function CompetitorSheet({
  competitor,
  onOpenChange,
  open,
}: CompetitorSheetProps) {
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="md:w-[50vw] md:max-w-2xl"
        side="right"
        variant="panel"
      >
        {competitor ? <CompetitorView competitor={competitor} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function PropertyRow({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="w-24 shrink-0 pt-0.5 text-muted-foreground text-xs">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-start gap-1.5">{children}</div>
    </div>
  );
}

function BulletSection({
  color,
  items,
  label,
}: {
  color: "green" | "red";
  items: string[];
  label: string;
}) {
  if (items.length === 0) {
    return null;
  }

  const dotColor = color === "green" ? "bg-green-500" : "bg-red-500";
  const labelColor = color === "green" ? "text-green-600" : "text-red-600";

  return (
    <div>
      <span className={cn("font-medium text-xs", labelColor)}>{label}</span>
      <ul className="mt-1 space-y-1">
        {items.map((line) => (
          <li
            className="flex items-start gap-2 text-muted-foreground text-sm"
            key={line}
          >
            <span
              className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", dotColor)}
            />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

function parseBulletString(value: string): string[] {
  return value
    .split("\n")
    .filter(Boolean)
    .map((line) => line.replace(BULLET_PREFIX_RE, ""));
}

function MovesTimeline({
  moves,
}: {
  moves: NonNullable<Doc<"autopilotCompetitors">["moves"]>;
}) {
  const [showAll, setShowAll] = useState(false);
  const sorted = [...moves].sort((a, b) => b.recordedAt - a.recordedAt);
  const visible = showAll ? sorted : sorted.slice(0, MOVES_VISIBLE_DEFAULT);

  return (
    <div>
      <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
        Competitor Moves
      </span>
      <ul className="mt-2 space-y-3">
        {visible.map((m) => (
          <li
            className="flex flex-col gap-0.5 border-border border-l-2 pl-3"
            key={m.recordedAt}
          >
            <span className="text-sm">{m.action}</span>
            <span className="text-muted-foreground text-xs">{m.impact}</span>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {formatDistanceToNow(m.recordedAt, { addSuffix: true })}
              </span>
              {m.sourceUrl && (
                <a
                  className="flex items-center gap-0.5 text-muted-foreground text-xs hover:text-foreground"
                  href={m.sourceUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <IconExternalLink className="size-3" />
                  Source
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
      {sorted.length > MOVES_VISIBLE_DEFAULT && (
        <Button
          className="mt-2 h-auto p-0 text-xs"
          onClick={() => setShowAll((prev) => !prev)}
          variant="link"
        >
          {showAll
            ? "Show less"
            : `Show ${String(sorted.length - MOVES_VISIBLE_DEFAULT)} more`}
        </Button>
      )}
    </div>
  );
}

function FeatureGapsTable({
  gaps,
}: {
  gaps: NonNullable<Doc<"autopilotCompetitors">["featureGaps"]>;
}) {
  if (gaps.length === 0) {
    return null;
  }

  return (
    <div>
      <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
        Feature Comparison
      </span>
      <div className="mt-2 overflow-hidden rounded-md border border-border text-sm">
        <div className="grid grid-cols-3 gap-px bg-muted px-3 py-1.5 font-medium text-muted-foreground text-xs">
          <span>Feature</span>
          <span>Us</span>
          <span>Them</span>
        </div>
        {gaps.map((g) => (
          <div
            className="grid grid-cols-3 gap-px px-3 py-2 even:bg-muted/30"
            key={g.feature}
          >
            <span className="font-medium">{g.feature}</span>
            <span className="text-muted-foreground">{g.us}</span>
            <span className="text-muted-foreground">{g.them}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function computeStaleness(lastResearchedAt?: number) {
  if (!lastResearchedAt) {
    return { isStale: false, isAging: false };
  }
  const age = Date.now() - lastResearchedAt;
  const STALENESS_30D = 30 * 24 * 60 * 60 * 1000;
  const STALENESS_7D = 7 * 24 * 60 * 60 * 1000;
  const isStale = age > STALENESS_30D;
  return { isStale, isAging: age > STALENESS_7D && !isStale };
}

function parseFeatures(features?: string): string[] {
  if (!features) {
    return [];
  }
  return features
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
}

function CompetitorPropertyGrid({
  competitor,
  isAging,
  isStale,
}: {
  competitor: Doc<"autopilotCompetitors">;
  isAging: boolean;
  isStale: boolean;
}) {
  const featureList = parseFeatures(competitor.features);

  return (
    <div className="text-sm">
      {competitor.url && (
        <PropertyRow label="Website">
          <a
            className="flex items-center gap-1 truncate text-primary hover:underline"
            href={competitor.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            <IconExternalLink className="size-3 shrink-0" />
            {competitor.url}
          </a>
        </PropertyRow>
      )}

      {competitor.description && (
        <PropertyRow label="Description">
          <span className="text-muted-foreground">
            {competitor.description}
          </span>
        </PropertyRow>
      )}

      {competitor.pricing && (
        <PropertyRow label="Pricing">
          <span>{competitor.pricing}</span>
        </PropertyRow>
      )}

      {featureList.length > 0 && (
        <PropertyRow label="Features">
          <div className="flex flex-wrap gap-1">
            {featureList.map((feat) => (
              <Badge key={feat} variant="outline">
                {feat}
              </Badge>
            ))}
          </div>
        </PropertyRow>
      )}

      {competitor.socialLinks && (
        <PropertyRow label="Social">
          <span className="text-muted-foreground">
            {competitor.socialLinks}
          </span>
        </PropertyRow>
      )}

      {competitor.lastResearchedAt && (
        <PropertyRow label="Last Researched">
          <span
            className={cn(
              isStale && "text-red-500",
              isAging && "text-yellow-500"
            )}
          >
            {formatDistanceToNow(competitor.lastResearchedAt, {
              addSuffix: true,
            })}
          </span>
        </PropertyRow>
      )}

      <PropertyRow label="Added">
        <span>
          {formatDistanceToNow(competitor.createdAt, { addSuffix: true })}
        </span>
      </PropertyRow>
    </div>
  );
}

function CompetitorView({
  competitor,
}: {
  competitor: Doc<"autopilotCompetitors">;
}) {
  const { isStale, isAging } = computeStaleness(competitor.lastResearchedAt);
  const scoreColor =
    competitor.competitivityScore === undefined
      ? null
      : getScoreColor(competitor.competitivityScore);

  const strengthsItems =
    competitor.strengthsList ??
    (competitor.strengths ? parseBulletString(competitor.strengths) : []);
  const weaknessesItems =
    competitor.weaknessesList ??
    (competitor.weaknesses ? parseBulletString(competitor.weaknesses) : []);

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          {competitor.pricingTier && (
            <Badge variant="secondary">{competitor.pricingTier}</Badge>
          )}
          {competitor.trafficEstimate && (
            <Badge variant="outline">{competitor.trafficEstimate}</Badge>
          )}
          {competitor.competitivityScore !== undefined && scoreColor && (
            <Badge
              color={scoreColor === "default" ? undefined : scoreColor}
              variant={scoreColor === "default" ? "outline" : undefined}
            >
              {String(competitor.competitivityScore)}/10
            </Badge>
          )}
          {isStale && <Badge color="red">Outdated</Badge>}
          {isAging && <Badge color="yellow">Aging</Badge>}
        </div>
        <SheetTitle>{competitor.name}</SheetTitle>
        <SheetDescription className="sr-only">
          Competitor details
        </SheetDescription>
      </SheetHeader>
      <ScrollArea className="flex-1" classNameViewport="px-4">
        <CompetitorPropertyGrid
          competitor={competitor}
          isAging={isAging}
          isStale={isStale}
        />

        {(strengthsItems.length > 0 ||
          weaknessesItems.length > 0 ||
          competitor.differentiator) && (
          <>
            <Separator className="my-4" />
            <div className="space-y-4">
              {strengthsItems.length > 0 && (
                <BulletSection
                  color="green"
                  items={strengthsItems}
                  label="Strengths"
                />
              )}

              {weaknessesItems.length > 0 && (
                <BulletSection
                  color="red"
                  items={weaknessesItems}
                  label="Weaknesses"
                />
              )}

              {competitor.differentiator && (
                <div className="rounded-md bg-muted/50 p-3">
                  <span className="font-medium text-xs uppercase tracking-wider">
                    How we differ
                  </span>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {competitor.differentiator}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {competitor.moves && competitor.moves.length > 0 && (
          <>
            <Separator className="my-4" />
            <MovesTimeline moves={competitor.moves} />
          </>
        )}

        {competitor.featureGaps && competitor.featureGaps.length > 0 && (
          <>
            <Separator className="my-4" />
            <FeatureGapsTable gaps={competitor.featureGaps} />
          </>
        )}
      </ScrollArea>
    </>
  );
}
