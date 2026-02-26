"use client";

/*
 * Product Showcase — interactive tab-switching between Feed / Roadmap / Changelog.
 * This is the "Screenshot Moment" — a full-bleed section with dramatic scale.
 * Each tab swaps in a rich product UI mockup.
 */

import { ChatCircleDots, Kanban, MegaphoneSimple } from "@phosphor-icons/react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { lazy, Suspense, useRef, useState } from "react";

import { H2, Lead, Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

const FeedbackBoardMockup = lazy(() => import("./mockup-feedback"));
const RoadmapMockup = lazy(() => import("./mockup-roadmap"));
const ChangelogMockup = lazy(() => import("./mockup-changelog"));

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const SHOWCASE_TABS = [
  {
    id: "feedback",
    label: "Feedback Board",
    icon: ChatCircleDots,
    description:
      "Collect and prioritize user requests with voting, AI triage, and duplicate detection.",
  },
  {
    id: "roadmap",
    label: "Roadmap",
    icon: Kanban,
    description:
      "Drag prioritized items into columns. Sync with GitHub issues and track progress visually.",
  },
  {
    id: "changelog",
    label: "Changelog",
    icon: MegaphoneSimple,
    description:
      "Publish releases, link resolved feedback, and automatically notify every voter.",
  },
] as const;

type ShowcaseTabId = (typeof SHOWCASE_TABS)[number]["id"];

export default function LandingShowcase() {
  const [activeTab, setActiveTab] = useState<ShowcaseTabId>("feedback");
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  const activeInfo = SHOWCASE_TABS.find((t) => t.id === activeTab);

  return (
    <section
      className="relative overflow-hidden bg-muted py-24 sm:py-32 dark:bg-sidebar"
      ref={ref}
    >
      {/* Subtle texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%200h1v1H0z%22%20fill%3D%22%23000%22%2F%3E%3C%2Fsvg%3E')] dark:opacity-[0.02]" />

      <div className="relative mx-auto max-w-300 px-5 sm:px-8">
        {/* Section header */}
        <motion.div
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-12 max-w-150"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
        >
          <Text as="span" className="mb-3 block" variant="eyebrow">
            The complete feedback loop
          </Text>
          <H2 className="mb-4" variant="landing">
            Three tools.{" "}
            <span className="text-muted-foreground">One cycle.</span>
          </H2>
          <Lead size="sm">
            Feedback flows in, gets triaged, lands on your roadmap, and ships as
            a changelog — every voter notified automatically.
          </Lead>
        </motion.div>

        {/* Tab bar */}
        <motion.div
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-8 flex flex-wrap gap-2"
          initial={{ opacity: 0, y: 12 }}
          transition={{ delay: 0.15, duration: 0.5, ease: EASE_OUT_EXPO }}
        >
          {SHOWCASE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                className={cn(
                  "relative flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium text-[13px] transition-all",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/70"
                )}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-card shadow-sm"
                    layoutId="showcase-tab-bg"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon size={15} weight={isActive ? "fill" : "regular"} />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* Active tab description */}
        <AnimatePresence mode="wait">
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 max-w-120 text-[14px] text-muted-foreground leading-relaxed"
            exit={{ opacity: 0, y: -4 }}
            initial={{ opacity: 0, y: 4 }}
            key={activeTab}
            transition={{ duration: 0.2 }}
          >
            {activeInfo?.description}
          </motion.p>
        </AnimatePresence>

        {/* Mockup viewport */}
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            initial={{ opacity: 0, y: 16 }}
            key={activeTab}
            transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
          >
            <Suspense
              fallback={
                <div className="flex h-100 items-center justify-center rounded-2xl border border-border bg-card">
                  <div className="size-5 animate-spin rounded-full border-2 border-olive-600/20 border-t-olive-600" />
                </div>
              }
            >
              {activeTab === "feedback" && <FeedbackBoardMockup />}
              {activeTab === "roadmap" && <RoadmapMockup />}
              {activeTab === "changelog" && <ChangelogMockup />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
