"use client";

import { Flag, GridFour, List } from "@phosphor-icons/react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type BoardView = "roadmap" | "feed" | "milestones";

const BOARD_VIEWS: readonly BoardView[] = [
  "roadmap",
  "feed",
  "milestones",
] as const;

const isBoardView = (value: string): value is BoardView =>
  (BOARD_VIEWS as readonly string[]).includes(value);

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
  return (
    <Tabs
      className={cn("flex-col", className)}
      onValueChange={(value) => {
        if (isBoardView(value)) {
          onChange(value);
        }
      }}
      value={view}
    >
      <TabsList className="h-10">
        <TabsTrigger className="h-8 gap-2 px-4" value="feed">
          <List className="h-4 w-4" />
          <span>List</span>
        </TabsTrigger>
        <TabsTrigger className="h-8 gap-2 px-4" value="roadmap">
          <GridFour className="h-4 w-4" />
          <span>Roadmap</span>
        </TabsTrigger>
        <TabsTrigger className="h-8 gap-2 px-4" value="milestones">
          <Flag className="h-4 w-4" />
          <span>Timeline</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
