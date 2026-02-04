"use client";

import { GridFour, List } from "@phosphor-icons/react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  return (
    <Tabs
      className={cn("flex-col", className)}
      onValueChange={(value) => onChange(value as BoardView)}
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
      </TabsList>
    </Tabs>
  );
}
