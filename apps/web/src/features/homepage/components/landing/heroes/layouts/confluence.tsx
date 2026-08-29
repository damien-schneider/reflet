import Link from "next/link";

import { ArrowRight } from "@/components/phosphor-icons";
import { Button } from "@/components/ui/button";

import GpuCanvas from "../gpu-canvas";
import {
  CONFLUENCE_MAIN_Y,
  CONFLUENCE_SHADER,
  CONFLUENCE_SOURCES,
} from "../shaders/confluence";

function topFor(y: number): string {
  return `${((1 - y) * 100).toFixed(1)}%`;
}

export default function HeroConfluence() {
  return (
    <section className="relative flex min-h-dvh flex-col justify-between overflow-hidden">
      <GpuCanvas
        className="pointer-events-none absolute inset-0 h-full w-full"
        shader={CONFLUENCE_SHADER}
      />

      {CONFLUENCE_SOURCES.map((source) => (
        <span
          className="hero-animate hero-fade-up hero-delay-3 absolute left-5 hidden -translate-y-1/2 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.16em] lg:block"
          key={source.label}
          style={{ top: topFor(source.y) }}
        >
          {source.label}
        </span>
      ))}
      <span
        className="hero-animate hero-fade-up hero-delay-3 absolute right-5 hidden -translate-y-1/2 font-mono text-[11px] text-olive-700 uppercase tracking-[0.16em] lg:block dark:text-olive-300"
        style={{ top: topFor(CONFLUENCE_MAIN_Y) }}
      >
        One board
      </span>

      <div className="relative mx-auto w-full max-w-[92rem] px-5 pt-[clamp(6rem,16svh,9rem)] sm:px-8 lg:px-24">
        <h1 className="hero-animate hero-fade-up hero-delay-0 max-w-[14ch] text-balance font-display text-[clamp(2.8rem,5.6vw,5rem)] text-olive-950 leading-[0.98] tracking-[-0.035em] dark:text-olive-100">
          Five channels. One board.
        </h1>

        <div className="mt-[clamp(1.5rem,4svh,2.5rem)] flex flex-col gap-7 lg:flex-row lg:items-end lg:gap-16">
          <p className="hero-animate hero-fade-up hero-delay-1 max-w-md text-[17px] text-foreground/70 leading-relaxed">
            Widget, email, Slack, API, interviews — wherever feedback starts, it
            flows into the same board and adds its weight to the request it
            belongs to.
          </p>

          <Button
            className="group hero-animate hero-fade-up hero-delay-2 h-12 shrink-0 self-start rounded-full px-7 text-[15px] lg:self-auto"
            render={<Link href="/dashboard" prefetch={true} />}
          >
            Start free
            <ArrowRight
              className="ml-1 transition-transform duration-300 group-hover:translate-x-0.5"
              size={15}
            />
          </Button>
        </div>
      </div>

      <div className="relative h-[36svh]" />
    </section>
  );
}
