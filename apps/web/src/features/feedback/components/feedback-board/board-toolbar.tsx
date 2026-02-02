"use client";

import { Plus } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { BoardViewToggle } from "../board-view-toggle";
import type { BoardViewType } from "./types";

interface BoardToolbarProps {
  view: BoardViewType;
  onViewChange: (view: BoardViewType) => void;
  onSubmitClick: () => void;
}

export function BoardToolbar({
  view,
  onViewChange,
  onSubmitClick,
}: BoardToolbarProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <BoardViewToggle
          onChange={(v) => onViewChange(v as BoardViewType)}
          view={view}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={onSubmitClick}>
          <Plus className="mr-2 h-4 w-4" />
          Submit Feedback
        </Button>
      </div>
    </div>
  );
}
