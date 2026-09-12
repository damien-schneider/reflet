"use client";

import { Tabs, TabsList, TabsTab } from "@ctrl-ui/react/ui/tabs";
import { Flag, GridFour, List } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type BoardView = "roadmap" | "feed" | "milestones";

const BOARD_VIEWS: readonly BoardView[] = [
  "roadmap",
  "feed",
  "milestones",
] as const;

const isBoardView = (value: string): value is BoardView =>
  BOARD_VIEWS.some((o) => o === value);

interface BoardViewToggleProps {
  className?: string;
  onChange: (view: BoardView) => void;
  view: BoardView;
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
        <TabsTab className="h-8 gap-2 px-4" value="feed">
          <List className="h-4 w-4" />
          <span>List</span>
        </TabsTab>
        <TabsTab className="h-8 gap-2 px-4" value="roadmap">
          <GridFour className="h-4 w-4" />
          <span>Roadmap</span>
        </TabsTab>
        <TabsTab className="h-8 gap-2 px-4" value="milestones">
          <Flag className="h-4 w-4" />
          <span>Timeline</span>
        </TabsTab>
      </TabsList>
    </Tabs>
  );
}
