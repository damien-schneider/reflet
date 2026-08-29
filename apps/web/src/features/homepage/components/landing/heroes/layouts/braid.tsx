import Link from "next/link";

import { ArrowRight } from "@/components/phosphor-icons";
import { Button } from "@/components/ui/button";

import GpuCanvas from "../gpu-canvas";
import { BRAID_ENTRIES, BRAID_MAIN_Y, BRAID_SHADER } from "../shaders/braid";

function topFor(y: number): string {
  return `${((1 - y) * 100).toFixed(1)}%`;
}

export default function HeroBraid() {
  return (
    <section className="relative flex min-h-dvh flex-col justify-end overflow-hidden">
      <GpuCanvas
        className="pointer-events-none absolute inset-0 h-full w-full"
        shader={BRAID_SHADER}
      />

      {BRAID_ENTRIES.map((entry) => (
        <span
          className="hero-animate hero-fade-up hero-delay-3 absolute left-5 hidden max-w-56 -translate-y-1/2 text-[11px] text-muted-foreground/80 lg:block"
          key={entry.label}
          style={{ top: topFor(entry.y) }}
        >
          {entry.label}
        </span>
      ))}
      <span
        className="hero-animate hero-fade-up hero-delay-3 absolute right-5 hidden -translate-y-1/2 font-mono text-[11px] text-olive-700 lg:block dark:text-olive-300"
        style={{ top: topFor(BRAID_MAIN_Y + 0.07) }}
      >
        1 request · 284 votes
      </span>

      <div className="relative px-5 pb-[clamp(3rem,9svh,5rem)] sm:px-8 lg:px-12">
        <h1 className="hero-animate hero-fade-up hero-delay-0 max-w-[14ch] font-display text-[clamp(3rem,7.5vw,6.5rem)] text-olive-950 leading-[0.9] tracking-[-0.04em] dark:text-olive-100">
          Merged, not lost.
        </h1>

        <div className="mt-[clamp(1.5rem,4svh,2.5rem)] flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <p className="hero-animate hero-fade-up hero-delay-1 max-w-md text-[17px] text-foreground/70 leading-relaxed">
            Five people asked five different ways. Reflet weaves them into one
            request — every voice still in the thread. Hover the braid to see
            them.
          </p>

          <Button
            className="group hero-animate hero-fade-up hero-delay-2 h-12 shrink-0 rounded-full px-7 text-[15px]"
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
    </section>
  );
}
