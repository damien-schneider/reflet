"use client";

import { ChatCircleDots, Check, Code } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { H3 } from "@/components/ui/typography";

export function WidgetCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setIsOpen(false);
    }, 1500);
  };

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-500 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-center justify-between border-border border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
            <Code size={18} weight="bold" />
          </div>
          <H3 className="text-sm" variant="cardBold">
            Embed Widget
          </H3>
        </div>
        <Badge variant="secondary">SDK</Badge>
      </div>

      {/* Widget preview area */}
      <div className="relative flex flex-1 items-center justify-center bg-muted/20 p-4">
        {/* Simulated page background */}
        <div className="absolute inset-4 rounded-lg border border-border/30 bg-background">
          <div className="flex items-center gap-1 border-border/30 border-b px-3 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-red-400/40" />
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400/40" />
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/40" />
            <span className="ml-2 font-mono text-[8px] text-muted-foreground/50">
              yourapp.com
            </span>
          </div>
          <div className="space-y-2 p-3">
            <div className="h-2 w-3/4 rounded bg-muted/50" />
            <div className="h-2 w-1/2 rounded bg-muted/30" />
            <div className="h-2 w-2/3 rounded bg-muted/40" />
          </div>
        </div>

        {/* Floating trigger button */}
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute right-4 bottom-4 z-10 w-[200px] overflow-hidden rounded-xl border border-border bg-card shadow-xl"
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              key="dialog"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              {submitted ? (
                <div className="flex flex-col items-center gap-2 p-5">
                  <motion.div
                    animate={{ scale: [0, 1.2, 1] }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                    transition={{ duration: 0.4 }}
                  >
                    <Check size={16} weight="bold" />
                  </motion.div>
                  <span className="font-medium text-foreground text-xs">
                    Sent!
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between border-border border-b px-3 py-2">
                    <span className="font-semibold text-[11px] text-foreground">
                      Send Feedback
                    </span>
                    <button
                      className="text-muted-foreground text-xs hover:text-foreground"
                      onClick={() => setIsOpen(false)}
                      type="button"
                    >
                      &times;
                    </button>
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="flex gap-1">
                      {(["Feature", "Bug", "Question"] as const).map((cat) => (
                        <span
                          className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground first:border-primary first:bg-primary/10 first:text-primary"
                          key={cat}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                    <div className="h-12 rounded-md border border-border bg-muted/30 p-1.5">
                      <span className="text-[10px] text-muted-foreground/50">
                        Describe your feedback...
                      </span>
                    </div>
                    <button
                      className="w-full rounded-md bg-primary py-1.5 font-medium text-[10px] text-primary-foreground"
                      onClick={handleSubmit}
                      type="button"
                    >
                      Submit
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.button
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-6 bottom-6 z-10 flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 font-medium text-primary-foreground text-xs shadow-lg transition-shadow hover:shadow-xl"
              exit={{ opacity: 0, scale: 0.8 }}
              initial={{ opacity: 0, scale: 0.8 }}
              key="trigger"
              onClick={() => setIsOpen(true)}
              type="button"
            >
              <ChatCircleDots size={14} weight="fill" />
              Feedback
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
