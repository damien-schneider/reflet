import Link from "next/link";

import { ArrowRight } from "@/components/phosphor-icons";
import { Button } from "@/components/ui/button";

import FeedbackBoard from "../../mockups/feedback-board";
import GpuCanvas from "../gpu-canvas";
import { STAGE_SHADER } from "../shaders/stage";

const DOTS = ["close", "minimise", "zoom"] as const;

export default function HeroStage() {
  return (
    <section className="relative flex min-h-dvh flex-col overflow-hidden">
      <GpuCanvas
        className="pointer-events-none absolute inset-0 h-full w-full"
        shader={STAGE_SHADER}
      />

      <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center px-5 pt-[clamp(5rem,12svh,7rem)] text-center sm:px-8">
        <h1 className="hero-animate hero-fade-up hero-delay-0 text-balance font-display text-[clamp(2.6rem,4.8vw,4.2rem)] text-olive-950 leading-[1.0] tracking-[-0.03em] dark:text-olive-100">
          Your users are already asking.
        </h1>

        <p className="hero-animate hero-fade-up hero-delay-1 mt-6 max-w-lg text-[17px] text-foreground/70 leading-relaxed">
          This board is the real thing — file a request and watch Reflet read
          it, merge the duplicates, and rank it by votes.
        </p>

        <Button
          className="group hero-animate hero-fade-up hero-delay-2 mt-8 h-12 rounded-full px-7 text-[15px]"
          render={<Link href="/dashboard" prefetch={true} />}
        >
          Start free
          <ArrowRight
            className="ml-1 transition-transform duration-300 group-hover:translate-x-0.5"
            size={15}
          />
        </Button>
      </div>

      <div className="relative mx-auto mt-auto w-full max-w-3xl px-5 [perspective:2000px] sm:px-8">
        <div className="hero-animate hero-rise flex h-[min(30rem,42svh)] origin-top flex-col overflow-hidden rounded-t-2xl border border-border/80 border-b-0 bg-card shadow-[0_2px_8px_-2px_rgba(20,18,11,0.06),0_40px_80px_-24px_rgba(20,18,11,0.18)] dark:border-olive-800/70 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_40px_100px_-30px_rgba(0,0,0,0.8)]">
          <div className="flex shrink-0 items-center gap-3 border-border/70 border-b bg-muted/60 px-4 py-2.5 dark:bg-sidebar/60">
            <span className="flex gap-1.5">
              {DOTS.map((dot) => (
                <span className="size-2 rounded-full bg-border" key={dot} />
              ))}
            </span>
            <span className="truncate font-mono text-[11px] text-muted-foreground">
              acme.reflet.app/board
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <FeedbackBoard />
          </div>
        </div>
      </div>
    </section>
  );
}
