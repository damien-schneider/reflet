"use client";

import { GridFour, List } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const feedRef = useRef<HTMLButtonElement>(null);
  const roadmapRef = useRef<HTMLButtonElement>(null);
  const [bgStyle, setBgStyle] = useState({ left: 4, width: 0 });

  const handleFeedClick = useCallback(() => {
    onChange("feed");
  }, [onChange]);

  const handleRoadmapClick = useCallback(() => {
    onChange("roadmap");
  }, [onChange]);

  useEffect(() => {
    const activeRef = view === "feed" ? feedRef : roadmapRef;
    if (activeRef.current) {
      setBgStyle({
        left: activeRef.current.offsetLeft,
        width: activeRef.current.offsetWidth,
      });
    }
  }, [view]);

  return (
    <div
      className={cn(
        "relative flex h-10 items-center gap-1 rounded-full bg-muted p-1",
        className
      )}
    >
      {/* Animated background - always behind buttons */}
      <motion.span
        animate={{ left: bgStyle.left, width: bgStyle.width }}
        className="absolute inset-y-1 rounded-full bg-background shadow-sm"
        initial={false}
        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
      />

      <button
        className={cn(
          "relative z-10 flex h-8 items-center gap-2 rounded-full px-4 font-medium text-sm transition-colors",
          view === "feed" ? "text-foreground" : "text-muted-foreground"
        )}
        onClick={handleFeedClick}
        ref={feedRef}
        type="button"
      >
        <List className="h-4 w-4" />
        <span>List</span>
      </button>
      <button
        className={cn(
          "relative z-10 flex h-8 items-center gap-2 rounded-full px-4 font-medium text-sm transition-colors",
          view === "roadmap" ? "text-foreground" : "text-muted-foreground"
        )}
        onClick={handleRoadmapClick}
        ref={roadmapRef}
        type="button"
      >
        <GridFour className="h-4 w-4" />
        <span>Roadmap</span>
      </button>
    </div>
  );
}
