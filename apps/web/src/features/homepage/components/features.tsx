"use client";

import { motion } from "motion/react";

import { H2 } from "@/components/ui/typography";
import { useInView } from "../hooks/use-in-view";
import { AITriageCard } from "./feature-cards/ai-triage-card";
import { ChangelogCard } from "./feature-cards/changelog-card";
import { DeveloperCard } from "./feature-cards/developer-card";
import { FeedbackBoardCard } from "./feature-cards/feedback-board-card";
import { OpenSourceCard } from "./feature-cards/open-source-card";
import { RoadmapKanbanCard } from "./feature-cards/roadmap-kanban-card";
import { WidgetCard } from "./feature-cards/widget-card";

const GRID_ITEMS = [
  {
    id: "feedback",
    Component: FeedbackBoardCard,
    className: "md:col-span-2 md:row-span-2",
  },
  { id: "ai", Component: AITriageCard, className: "md:row-span-2" },
  { id: "roadmap", Component: RoadmapKanbanCard, className: "" },
  { id: "widget", Component: WidgetCard, className: "" },
  { id: "changelog", Component: ChangelogCard, className: "" },
  { id: "developer", Component: DeveloperCard, className: "md:col-span-2" },
  { id: "opensource", Component: OpenSourceCard, className: "" },
] as const;

export default function Features() {
  const { ref, isInView } = useInView(0.05);

  return (
    <section className="relative py-24" id="features" ref={ref}>
      <div className="relative z-10 mx-auto max-w-7xl px-4 text-left sm:px-6 lg:px-8">
        <motion.div
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-4"
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.4 }}
        >
          <span className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
            Why Reflet?
          </span>
        </motion.div>

        <motion.div
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <H2 className="mb-14 max-w-2xl" variant="section">
            Everything you need to build products users love.
          </H2>
        </motion.div>

        {/* Bento grid — 3 cols on md+ */}
        <div className="grid grid-cols-1 gap-3 md:auto-rows-[minmax(240px,auto)] md:grid-cols-3">
          {GRID_ITEMS.map((item, i) => {
            const { Component } = item;
            return (
              <motion.div
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                className={item.className}
                initial={{ opacity: 0, y: 20 }}
                key={item.id}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.06 }}
              >
                <Component />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
