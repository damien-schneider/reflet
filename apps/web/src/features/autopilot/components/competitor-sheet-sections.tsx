"use client";

import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { IconExternalLink } from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const MOVES_VISIBLE_DEFAULT = 10;

export function MovesTimeline({
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

export function FeatureGapsTable({
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
