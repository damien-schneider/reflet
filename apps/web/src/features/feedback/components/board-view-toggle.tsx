"use client";

import { GridFour, List } from "@phosphor-icons/react";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type BoardView = "roadmap" | "feed";

interface BoardViewToggleProps {
  view: BoardView;
  onChange: (view: BoardView) => void;
  className?: string;
}

export function BoardViewToggle({
  view,
  onChange,
  className,
}: BoardViewToggleProps) {
  const handleRoadmapClick = useCallback(() => {
    onChange("roadmap");
  }, [onChange]);

  const handleFeedClick = useCallback(() => {
    onChange("feed");
  }, [onChange]);

  return (
    <div
      className={cn("flex items-center gap-1 rounded-lg border p-1", className)}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label="Roadmap view"
              onClick={handleRoadmapClick}
              size="icon-sm"
              variant={view === "roadmap" ? "secondary" : "ghost"}
            />
          }
        >
          <GridFour className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>Roadmap (Kanban)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label="Feed view"
              onClick={handleFeedClick}
              size="icon-sm"
              variant={view === "feed" ? "secondary" : "ghost"}
            />
          }
        >
          <List className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>Feed (List)</TooltipContent>
      </Tooltip>
    </div>
  );
}
