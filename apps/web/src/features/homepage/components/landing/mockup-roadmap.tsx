"use client";

/*
 * MOCKUP 2 — Roadmap Kanban Board
 * Horizontal columns with drag-handle styling, assignee avatars, and vote counts.
 * Presented in an elevated "app window" frame with a dark title bar.
 */

import { ArrowUp, DotsSixVertical, Kanban } from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

import { ROADMAP_COLUMNS_DATA } from "./landing-data";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export default function RoadmapMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div
      animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
      className="w-full overflow-hidden rounded-xl shadow-[0_24px_64px_-16px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.5)]"
      initial={{ opacity: 0, y: 40, rotateX: 4 }}
      ref={ref}
      style={{ perspective: "1200px" }}
      transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 bg-[#2a2924] px-4 py-2.5 dark:bg-sidebar">
        <div className="flex gap-1.5">
          <div className="size-2.5 rounded-full bg-[#ff5f57]" />
          <div className="size-2.5 rounded-full bg-[#febc2e]" />
          <div className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex flex-1 items-center justify-center gap-1.5">
          <Kanban className="text-[#999] dark:text-[#666]" size={12} />
          <span className="font-medium text-[#999] text-[11px] dark:text-[#666]">
            Roadmap — Reflet
          </span>
        </div>
        <div className="w-12" />
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto bg-accent p-5 dark:bg-background">
        {ROADMAP_COLUMNS_DATA.map((col, colIdx) => (
          <motion.div
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            className="w-60 shrink-0"
            initial={{ opacity: 0, y: 20 }}
            key={col.id}
            transition={{
              delay: 0.25 + colIdx * 0.12,
              duration: 0.6,
              ease: EASE_OUT_EXPO,
            }}
          >
            {/* Column header */}
            <div className="mb-3 flex items-center gap-2">
              <div className={cn("size-2 rounded-full", col.dotColor)} />
              <span className="font-semibold text-[12px] text-foreground">
                {col.title}
              </span>
              <span className="font-medium text-[11px] text-muted-foreground">
                {col.items.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {col.items.map((item, itemIdx) => (
                <motion.div
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  className="group cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  key={item.id}
                  transition={{
                    delay: 0.3 + colIdx * 0.12 + itemIdx * 0.06,
                    duration: 0.4,
                    ease: EASE_OUT_EXPO,
                  }}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <p className="font-medium text-[12px] text-foreground leading-snug">
                      {item.title}
                    </p>
                    <DotsSixVertical
                      className="mt-0.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100"
                      size={12}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ArrowUp size={10} />
                      <span className="font-medium text-[11px]">
                        {item.votes}
                      </span>
                    </div>
                    <div className="flex -space-x-1.5">
                      {item.assignees.map((initial, i) => (
                        <div
                          className={cn(
                            "flex size-5 items-center justify-center rounded-full border-2 border-card font-bold text-[7px] text-white",
                            item.colors[i]
                          )}
                          key={initial}
                        >
                          {initial}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Ghost card */}
              <div className="flex items-center justify-center rounded-lg border border-border border-dashed py-2.5 text-muted-foreground/30 transition-colors hover:border-olive-600/20 hover:text-olive-600/40">
                <span className="text-[11px]">+ Add item</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
