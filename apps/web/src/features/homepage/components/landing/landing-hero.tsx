import dynamic from "next/dynamic";
import Link from "next/link";

import { ArrowRight } from "@/components/phosphor-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HeroSurface = dynamic(() => import("./hero-surface"));
const HeroReflet = dynamic(() => import("./hero-reflet"));
const BoardAnswers = dynamic(() => import("./mockups/board-answers"));

const HEADLINE_CLASS =
  "font-display text-balance text-[clamp(2.35rem,3.4vw,3.4rem)] text-olive-950 leading-[1.05] tracking-[-0.02em] dark:text-olive-100";

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[80vh] bg-[radial-gradient(ellipse_70%_55%_at_38%_0%,color-mix(in_oklch,var(--color-olive-600)_9%,transparent),transparent)]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[105vh] [mask-composite:intersect] [mask-image:radial-gradient(58%_50%_at_22%_46%,rgba(0,0,0,0.3),black_72%),linear-gradient(to_bottom,black_45%,transparent_96%)]"
      >
        <HeroReflet />
      </div>
      <div className="paper-grain pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-multiply [mask-image:linear-gradient(to_bottom,black_60%,transparent)] dark:opacity-[0.05] dark:mix-blend-screen" />

      <div className="relative mx-auto grid w-full max-w-[96rem] grid-cols-1 items-center gap-14 px-5 pt-14 pb-32 sm:px-8 sm:pt-20 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:gap-16 lg:px-12 lg:pb-40 xl:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] xl:gap-24">
        <div className="max-w-150">
          <h1
            className={cn(
              HEADLINE_CLASS,
              "hero-animate hero-fade-up hero-delay-0"
            )}
          >
            Ship what your users <em>actually</em> asked for.
          </h1>

          <p className="hero-animate hero-fade-up hero-delay-1 mt-7 text-[17px] text-foreground/70 leading-relaxed sm:text-[18px]">
            Every request in one board. Duplicates merged automatically.
            Everyone who voted hears back the day you ship.
          </p>

          <Button
            className="hero-animate hero-fade-up hero-delay-2 group mt-9 h-11 rounded-full px-6 text-[15px]"
            render={<Link href="/dashboard" prefetch={true} />}
          >
            Start free
            <ArrowRight
              className="ml-1 transition-transform duration-300 group-hover:translate-x-0.5"
              size={15}
            />
          </Button>

          <div className="hero-animate hero-fade-up hero-delay-3 mt-11 border-border/70 border-t pt-7">
            <BoardAnswers />
          </div>
        </div>

        <HeroSurface />
      </div>
    </section>
  );
}
