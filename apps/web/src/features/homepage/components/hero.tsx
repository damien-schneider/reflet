"use client";

import {
  ArrowRight,
  CaretRight,
  ChatCircleDots,
  Kanban,
  MegaphoneSimple,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { H1, Lead } from "@/components/ui/typography";
import {
  ChangelogView,
  FeedbackView,
  RoadmapView,
} from "@/features/homepage/components/hero-tab-views";
import { cn } from "@/lib/utils";

// =============================================================================
// Tab definitions
// =============================================================================

const TABS = [
  { id: "feedback", label: "Feedback", icon: ChatCircleDots },
  { id: "roadmap", label: "Roadmap", icon: Kanban },
  { id: "changelog", label: "Changelog", icon: MegaphoneSimple },
] as const;

type TabId = (typeof TABS)[number]["id"];

// =============================================================================
// Hero component
// =============================================================================

export default function Hero() {
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-start px-4 py-10 text-left sm:px-6 sm:py-20 lg:px-8">
      {/* Announcement Pill */}
      <a
        className="group mb-6 inline-flex cursor-pointer flex-wrap items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1 transition-colors hover:bg-muted sm:mb-8 sm:gap-2"
        href="https://github.com/damien-schneider/reflet"
        rel="noopener noreferrer"
        target="_blank"
      >
        <span className="font-medium text-foreground text-xs sm:text-sm">
          Reflet is now Open Source
        </span>
        <span className="hidden text-muted-foreground sm:inline">|</span>
        <span className="flex items-center font-medium text-muted-foreground text-xs group-hover:text-foreground sm:text-sm">
          Star on GitHub <CaretRight className="ml-1" size={14} />
        </span>
      </a>

      {/* Headings */}
      <H1 className="mb-4 w-full sm:mb-6 sm:w-2/3" variant="hero">
        A modern product feedback and roadmap platform.
      </H1>

      <Lead className="mb-8 max-w-2xl sm:mb-10">
        Collect feedback, prioritize features, and keep your users in the loop
        with a real-time collaborative board. Changes appear across all devices
        in milliseconds.
      </Lead>

      {/* Buttons */}
      <div className="mb-12 flex flex-col items-center gap-4 sm:mb-20 sm:flex-row">
        <Link href="/dashboard">
          <Button
            className="w-full rounded-full sm:w-auto"
            size="lg"
            variant="default"
          >
            Start free trial
          </Button>
        </Link>
        <button
          className="flex w-full items-center justify-center font-medium text-foreground transition-opacity hover:opacity-70 sm:w-auto sm:justify-start"
          onClick={() => {
            const element = document.getElementById("demo");
            if (element) {
              element.scrollIntoView({ behavior: "smooth" });
            }
          }}
          type="button"
        >
          View Demo <ArrowRight className="ml-2" size={18} />
        </button>
      </div>

      {/* Interactive Dashboard Mockup */}
      <InteractiveMockup />
    </section>
  );
}

// =============================================================================
// Interactive Mockup with tab switching
// =============================================================================

function InteractiveMockup() {
  const [activeTab, setActiveTab] = useState<TabId>("feedback");

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-muted p-2 shadow-2xl sm:rounded-3xl sm:p-3 md:p-6">
      <div className="mx-auto flex max-w-[1200px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg sm:rounded-xl">
        {/* Top navigation bar with tabs */}
        <div className="flex items-center justify-between border-border border-b bg-muted/30 px-4 py-2 sm:px-6 sm:py-3">
          {/* App name */}
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-olive-600 font-bold text-[10px] text-olive-100">
              R
            </div>
            <span className="hidden font-semibold text-sm sm:inline">
              Reflet App
            </span>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-0.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-xs transition-colors sm:px-4",
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
                      className="absolute inset-0 rounded-md bg-card shadow-sm"
                      layoutId="hero-tab-bg"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon size={14} weight={isActive ? "fill" : "regular"} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="hidden font-medium text-[10px] text-muted-foreground sm:inline">
              Live
            </span>
          </div>
        </div>

        {/* View content with animation */}
        <div className="relative h-[320px] overflow-hidden sm:h-[440px] md:h-[520px]">
          <AnimatePresence mode="wait">
            {activeTab === "feedback" && <FeedbackView key="feedback" />}
            {activeTab === "roadmap" && <RoadmapView key="roadmap" />}
            {activeTab === "changelog" && <ChangelogView key="changelog" />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
