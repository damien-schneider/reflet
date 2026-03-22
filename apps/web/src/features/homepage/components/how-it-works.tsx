"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  ArrowRight,
  ArrowsClockwise,
  ChatCircleDots,
  Code,
  FunnelSimple,
} from "@phosphor-icons/react";

import { H2, H3, Lead } from "@/components/ui/typography";

interface Step {
  description: string;
  icon: Icon;
  id: string;
  number: number;
  title: string;
}

const STEPS: Step[] = [
  {
    id: "collect",
    number: 1,
    icon: ChatCircleDots,
    title: "Collect feedback",
    description:
      "Users submit feature requests and vote on existing ideas through your embedded widget, public board, or API.",
  },
  {
    id: "prioritize",
    number: 2,
    icon: FunnelSimple,
    title: "Prioritize with data",
    description:
      "AI auto-tags, detects duplicates, and estimates complexity. Sort by votes, filter by status, and see what matters most.",
  },
  {
    id: "build",
    number: 3,
    icon: Code,
    title: "Ship the right features",
    description:
      "Move items through your roadmap. Connect to GitHub to sync issues and track progress from feedback to release.",
  },
  {
    id: "close-loop",
    number: 4,
    icon: ArrowsClockwise,
    title: "Close the loop",
    description:
      "Publish changelog entries linked to the features users requested. They get notified automatically.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-muted py-24" id="how-it-works">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <span className="mb-4 block font-semibold text-muted-foreground text-sm uppercase tracking-wide">
          How it works
        </span>

        <H2 className="mb-6" variant="section">
          From feedback to feature in four steps
        </H2>
        <Lead className="mb-16 max-w-2xl">
          Reflet connects your users to your roadmap so nothing falls through
          the cracks.
        </Lead>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
          {STEPS.map((step, index) => {
            const isLast = index === STEPS.length - 1;

            return (
              <div className="contents" key={step.id}>
                <StepCard step={step} />
                {!isLast && <StepConnector />}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

interface StepCardProps {
  step: Step;
}

function StepCard({ step }: StepCardProps) {
  const StepIcon = step.icon;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-sm">
          {step.number}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground">
          <StepIcon size={22} />
        </div>
      </div>
      <H3 className="mb-2" variant="card">
        {step.title}
      </H3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {step.description}
      </p>
    </div>
  );
}

function StepConnector() {
  return (
    <>
      {/* Desktop: vertical arrow between columns */}
      <div className="hidden items-center justify-center lg:flex">
        <ArrowRight
          className="text-muted-foreground/50"
          size={20}
          weight="bold"
        />
      </div>
      {/* Tablet & mobile: hidden (grid gap handles spacing) */}
    </>
  );
}
