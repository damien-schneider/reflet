"use client";

import { Sparkle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { H3 } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export function AITriageCard() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isAnalyzing || step >= 5) {
      return;
    }
    const timeout = setTimeout(() => setStep((s) => s + 1), 450);
    return () => clearTimeout(timeout);
  }, [isAnalyzing, step]);

  const handleMouseEnter = () => {
    setIsAnalyzing(true);
    setStep(0);
  };

  const handleMouseLeave = () => {
    setIsAnalyzing(false);
    setStep(0);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover animation trigger
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: decorative hover effect
    <div
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-500 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center justify-between border-border border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
            <Sparkle size={18} weight="fill" />
          </div>
          <H3 className="text-sm" variant="cardBold">
            AI-Powered Triage
          </H3>
        </div>
      </div>

      {/* Analysis input */}
      <div className="border-border border-b px-5 py-2.5">
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
          Analyzing
        </span>
        <p className="font-medium text-foreground text-xs">
          &ldquo;Add keyboard shortcuts for power users&rdquo;
        </p>
      </div>

      {/* Results */}
      <div className="flex-1 divide-y divide-border">
        {/* Auto-tags */}
        <div
          className={cn(
            "flex items-center justify-between px-5 py-2.5 transition-all duration-300",
            step >= 1 ? "opacity-100" : "opacity-20"
          )}
        >
          <span className="text-muted-foreground text-xs">Tags</span>
          <div className="flex gap-1.5">
            <Badge color="purple">
              <Sparkle data-icon="inline-start" size={10} weight="fill" />
              UX
            </Badge>
            <Badge color="blue">
              <Sparkle data-icon="inline-start" size={10} weight="fill" />
              Productivity
            </Badge>
          </div>
        </div>

        {/* Priority */}
        <div
          className={cn(
            "flex items-center justify-between px-5 py-2.5 transition-all duration-300",
            step >= 2 ? "opacity-100" : "opacity-20"
          )}
        >
          <span className="text-muted-foreground text-xs">Priority</span>
          <Badge color="orange">
            <Sparkle data-icon="inline-start" size={10} weight="fill" />
            Medium
          </Badge>
        </div>

        {/* Complexity */}
        <div
          className={cn(
            "flex items-center justify-between px-5 py-2.5 transition-all duration-300",
            step >= 3 ? "opacity-100" : "opacity-20"
          )}
        >
          <span className="text-muted-foreground text-xs">Complexity</span>
          <div className="flex items-center gap-2">
            <Badge color="green">
              <Sparkle data-icon="inline-start" size={10} weight="fill" />
              Simple
            </Badge>
            <span className="font-mono text-[10px] text-muted-foreground">
              ~2h
            </span>
          </div>
        </div>

        {/* Duplicate */}
        <div
          className={cn(
            "px-5 py-2.5 transition-all duration-300",
            step >= 4 ? "opacity-100" : "opacity-20"
          )}
        >
          <span className="mb-1.5 block text-muted-foreground text-xs">
            Duplicate detected
          </span>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <Badge color="yellow">87%</Badge>
              <span className="text-foreground text-xs">
                Vim keybindings support
              </span>
            </div>
            <span className="cursor-pointer font-semibold text-[10px] text-primary hover:underline">
              Merge
            </span>
          </div>
        </div>

        {/* AI Clarification */}
        <div
          className={cn(
            "px-5 py-2.5 transition-all duration-300",
            step >= 5 ? "opacity-100" : "opacity-20"
          )}
        >
          <span className="mb-1.5 block text-muted-foreground text-xs">
            AI Summary
          </span>
          <div className="rounded-lg bg-olive-50/50 px-3 py-2 dark:bg-olive-950/20">
            <p className="font-medium text-[11px] text-olive-700 leading-relaxed dark:text-olive-300">
              User requests keyboard shortcuts to speed up navigation and common
              actions for power users.
            </p>
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="border-border border-t px-5 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Confidence</span>
          <span className="font-mono font-semibold text-[10px] text-primary">
            {step >= 5 ? "94%" : "..."}
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
            style={{ width: step >= 5 ? "94%" : `${step * 16}%` }}
          />
        </div>
        {!isAnalyzing && step === 0 && (
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground italic">
            Hover to analyze
          </p>
        )}
      </div>
    </div>
  );
}
