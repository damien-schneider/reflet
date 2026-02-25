"use client";

/*
 * MOCKUP 3 — Changelog Feed with linked feedback
 * Shows release cards with version badges, linked feedback counts,
 * and a floating notification toast that appears on scroll.
 */

import {
  Bell,
  CalendarBlank,
  CheckCircle,
  LinkSimple,
  MegaphoneSimple,
} from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { Badge } from "@/components/ui/badge";

import { CHANGELOG_ITEMS_DATA } from "./landing-data";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export default function ChangelogMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <div className="relative" ref={ref}>
      {/* Main changelog card */}
      <motion.div
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        className="overflow-hidden rounded-2xl border border-[#e8e6e1] bg-[#faf9f7] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] dark:border-[#ffffff0d] dark:bg-[#1e1d1a] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)]"
        initial={{ opacity: 0, y: 32 }}
        transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-[#e8e6e1] border-b px-5 py-3 dark:border-[#ffffff0d]">
          <div className="flex items-center gap-2.5">
            <MegaphoneSimple
              className="text-olive-600 dark:text-olive-400"
              size={16}
              weight="fill"
            />
            <span className="font-semibold text-[13px] text-foreground">
              Changelog
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Bell size={12} />
            <span>Subscribe</span>
          </div>
        </div>

        {/* Entries */}
        <div className="divide-y divide-[#e8e6e1] dark:divide-[#ffffff08]">
          {CHANGELOG_ITEMS_DATA.map((entry, idx) => (
            <motion.div
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              className="p-5"
              initial={{ opacity: 0, x: -20 }}
              key={entry.id}
              transition={{
                delay: 0.2 + idx * 0.1,
                duration: 0.5,
                ease: EASE_OUT_EXPO,
              }}
            >
              {/* Meta row */}
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <Badge color={entry.tagColor}>{entry.version}</Badge>
                <Badge color={entry.tagColor}>{entry.tag}</Badge>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CalendarBlank size={10} />
                  {entry.date}
                </span>
              </div>

              {/* Title */}
              <h4 className="mb-1.5 font-semibold text-[14px] text-foreground leading-snug">
                {entry.title}
              </h4>

              {/* Description */}
              <p className="mb-3 text-[12px] text-muted-foreground leading-relaxed">
                {entry.description}
              </p>

              {/* Linked feedback */}
              <div className="flex items-center gap-1.5 text-[11px] text-olive-600 dark:text-olive-400">
                <LinkSimple size={12} weight="bold" />
                <span className="font-medium">
                  {entry.linkedFeedback} resolved feedback items
                </span>
                <CheckCircle size={12} weight="fill" />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Floating notification toast */}
      <motion.div
        animate={isInView ? { opacity: 1, y: 0, x: 0 } : {}}
        className="absolute -right-3 -bottom-4 z-10 flex items-center gap-2.5 rounded-xl border border-[#e8e6e1] bg-[#faf9f7] p-3 shadow-lg sm:-right-6 sm:-bottom-6 dark:border-[#ffffff0d] dark:bg-[#1e1d1a] dark:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5)]"
        initial={{ opacity: 0, y: 16, x: 8 }}
        transition={{ delay: 0.8, duration: 0.6, ease: EASE_OUT_EXPO }}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
          <CheckCircle className="text-emerald-500" size={16} weight="fill" />
        </div>
        <div>
          <p className="font-semibold text-[11px] text-foreground">
            Voters notified
          </p>
          <p className="text-[10px] text-muted-foreground">
            312 users received your update
          </p>
        </div>
      </motion.div>
    </div>
  );
}
