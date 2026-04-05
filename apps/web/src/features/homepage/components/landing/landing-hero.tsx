/*
 * CREATIVE DIRECTION
 * 1. PRODUCT SOUL — The feedback loop that turns user voices into shipped features
 * 2. FEELING — Quiet confidence, like opening a beautifully organized notebook
 * 3. VISUAL THREAD — The loop / cycle — collect → understand → build → close
 * 4. ANTI-REFERENCE — Must NOT resemble a generic SaaS gradient hero with 3-col icons
 * 5. SCROLL STORY — Intrigue → Promise → Proof → Depth → Desire → Close
 * 6. DARK/LIGHT — Light = warm parchment studio; Dark = deep forest midnight
 */

import Link from "next/link";
import { ArrowRight, CaretRight, Sparkle } from "@/components/phosphor-icons";
import { Button } from "@/components/ui/button";
import { H1, Lead } from "@/components/ui/typography";

import { cn } from "@/lib/utils";

import { METRICS } from "./landing-data";

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Warm ambient gradient — subtle, not a SaaS cliché */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(120,113,80,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(120,113,80,0.15),transparent)]" />

      <div className="relative mx-auto max-w-300 px-5 pt-32 pb-20 sm:px-8 sm:pt-40 sm:pb-28">
        {/* Open source pill */}
        <Link
          className="hero-animate hero-fade-up hero-delay-0 group mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 backdrop-blur-sm transition-colors hover:border-olive-600/30 dark:hover:border-olive-400/30"
          href="/autopilot"
        >
          <Sparkle className="text-violet-500" size={14} weight="fill" />
          <span className="font-medium text-[13px] text-foreground">
            Introducing Autopilot
          </span>
          <span className="h-3 w-px bg-border" />
          <span className="flex items-center gap-0.5 text-[13px] text-muted-foreground transition-colors group-hover:text-foreground">
            10 AI agents for your product
            <CaretRight
              className="transition-transform group-hover:translate-x-0.5"
              size={12}
            />
          </span>
        </Link>

        {/* Main headline — editorial serif + sans-serif mix */}
        <H1 className="mb-6 max-w-205" variant="landing">
          Your AI company is{" "}
          <span className="relative">
            ready
            <svg
              aria-hidden="true"
              className="absolute -bottom-1 left-0 w-full text-olive-600/30 dark:text-olive-400/30"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 200 8"
            >
              <path
                d="M1 5.5C40 2 80 2 100 4C120 6 160 3 199 5.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.5"
              />
            </svg>
          </span>
          .<br />
          <span className="text-muted-foreground">Just connect your repo.</span>
        </H1>

        {/* Subheadline */}
        <Lead className="mb-10 max-w-140" size="lg">
          10 AI agents — CEO, PM, CTO, Dev, Growth, Sales, Security, Architect,
          Support, Docs — that autonomously run your product. From market
          research to shipped code to paying customers.
        </Lead>

        {/* CTAs */}
        <div className="hero-animate hero-fade-up hero-delay-3 mb-16 flex flex-wrap items-center gap-4">
          <Link href="/dashboard">
            <Button
              className="h-11 rounded-full px-6 text-[14px]"
              size="lg"
              variant="default"
            >
              Start your AI company
              <ArrowRight className="ml-1" size={16} />
            </Button>
          </Link>
          <Link
            className="flex items-center gap-1.5 font-medium text-[14px] text-foreground transition-opacity hover:opacity-70"
            href="/autopilot"
          >
            See how it works
            <CaretRight size={14} />
          </Link>
        </div>

        {/* Metrics bar — social proof woven into hero */}
        <div className="hero-animate hero-fade-in hero-delay-5 flex flex-wrap gap-8 sm:gap-12">
          {METRICS.map((m, i) => (
            <div
              className={cn("hero-animate hero-fade-up", `hero-delay-${6 + i}`)}
              key={m.label}
            >
              <span className="block font-display text-[2rem] text-olive-950 tracking-[-0.02em] sm:text-[2.5rem] dark:text-olive-100">
                {m.value}
              </span>
              <span className="text-[13px] text-muted-foreground">
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
