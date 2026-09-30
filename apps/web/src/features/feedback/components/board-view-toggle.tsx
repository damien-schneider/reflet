"use client";

import {
  Tabs,
  TabsList,
  type TabsListProps,
  TabsTab,
} from "@ctrl-ui/react/ui/tabs";
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
  size?: TabsListProps["size"];
  view: BoardView;
}

export function BoardViewToggle({
  view,
  onChange,
  className,
  size,
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
      <TabsList aria-label="Board view" size={size}>
        <TabsTab value="feed">
          <List aria-hidden className="size-4" />
          List
        </TabsTab>
        <TabsTab value="roadmap">
          <GridFour aria-hidden className="size-4" />
          Roadmap
        </TabsTab>
        <TabsTab value="milestones">
          <Flag aria-hidden className="size-4" />
          Timeline
        </TabsTab>
      </TabsList>
    </Tabs>
  );
}
