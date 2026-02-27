"use client";

import { ArrowUp, DotsSixVertical, Lightning } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { H3 } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

const KANBAN_COLS = [
  {
    id: "planned",
    title: "Planned",
    color: "green" as const,
    dotColor: "bg-[#0f7b6c]",
    items: [
      { id: "k1", title: "Dark mode", votes: 248 },
      { id: "k2", title: "Mobile app", votes: 98 },
    ],
  },
  {
    id: "progress",
    title: "In Progress",
    color: "orange" as const,
    dotColor: "bg-[#d9730d]",
    items: [{ id: "k3", title: "Slack integration", votes: 186 }],
  },
  {
    id: "done",
    title: "Done",
    color: "purple" as const,
    dotColor: "bg-[#6940a5]",
    items: [
      { id: "k5", title: "CSV Export", votes: 76 },
      { id: "k6", title: "Email digest", votes: 52 },
    ],
  },
] as const;

export function RoadmapKanbanCard() {
  const [dragging, setDragging] = useState<string | null>(null);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-500 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-center justify-between border-border border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
            <Lightning size={18} weight="fill" />
          </div>
          <H3 className="text-sm" variant="cardBold">
            Roadmap
          </H3>
        </div>
        <Badge variant="secondary">Kanban</Badge>
      </div>

      {/* Kanban columns */}
      <div className="flex flex-1 gap-2 overflow-x-auto p-3">
        {KANBAN_COLS.map((col) => (
          <div className="flex min-w-[140px] flex-1 flex-col" key={col.id}>
            {/* Column header */}
            <div className="mb-2 flex items-center gap-1.5">
              <div className={cn("h-2 w-2 rounded-full", col.dotColor)} />
              <span className="font-semibold text-[11px] text-foreground">
                {col.title}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {col.items.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-1 flex-col gap-1.5 rounded-lg bg-muted/30 p-1.5">
              {col.items.map((item) => (
                <motion.div
                  animate={
                    dragging === item.id
                      ? { scale: 1.05, rotate: 2, zIndex: 10 }
                      : { scale: 1, rotate: 0, zIndex: 0 }
                  }
                  className={cn(
                    "cursor-grab rounded-lg border border-border/50 bg-card p-2 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
                    dragging === item.id && "ring-2 ring-primary"
                  )}
                  key={item.id}
                  onPointerDown={() => setDragging(item.id)}
                  onPointerUp={() => setDragging(null)}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="truncate font-medium text-[11px] text-foreground">
                      {item.title}
                    </p>
                    <DotsSixVertical
                      className="shrink-0 text-muted-foreground/40"
                      size={10}
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                    <ArrowUp size={8} />
                    <span className="font-medium text-[9px]">{item.votes}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
