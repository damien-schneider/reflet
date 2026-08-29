import Link from "next/link";

import { ArrowRight } from "@/components/phosphor-icons";
import { Button } from "@/components/ui/button";

import GpuCanvas from "../gpu-canvas";
import {
  RESOLVE_BASE_Y,
  RESOLVE_SHADER,
  RESOLVE_TICKS,
} from "../shaders/resolve";

export default function HeroResolve() {
  return (
    <section className="relative flex min-h-dvh items-start overflow-hidden">
      <GpuCanvas
        className="pointer-events-none absolute inset-0 h-full w-full"
        shader={RESOLVE_SHADER}
      />

      {RESOLVE_TICKS.map((tick) => (
        <span
          className="hero-animate hero-fade-up hero-delay-3 absolute hidden -translate-x-1/2 font-mono text-[11px] text-olive-700 lg:block dark:text-olive-300"
          key={tick.label}
          style={{
            left: `${(tick.x * 100).toFixed(1)}%`,
            top: `${((1 - RESOLVE_BASE_Y) * 100 + 4).toFixed(1)}%`,
          }}
        >
          {tick.label}
        </span>
      ))}
      <span
        className="hero-animate hero-fade-up hero-delay-3 absolute left-5 hidden font-mono text-[11px] text-muted-foreground uppercase tracking-[0.16em] lg:block"
        style={{ top: `${((1 - RESOLVE_BASE_Y) * 100 + 12).toFixed(1)}%` }}
      >
        Raw feedback
      </span>

      <div className="relative mx-auto w-full max-w-[92rem] px-5 pt-[clamp(6rem,16svh,9rem)] sm:px-8 lg:px-12">
        <div className="max-w-xl">
          <h1 className="hero-animate hero-fade-up hero-delay-0 text-balance font-display text-[clamp(2.8rem,5.2vw,4.8rem)] text-olive-950 leading-[1.0] tracking-[-0.03em] dark:text-olive-100">
            From noise to roadmap.
          </h1>

          <p className="hero-animate hero-fade-up hero-delay-1 mt-6 max-w-md text-[17px] text-foreground/70 leading-relaxed">
            A hundred scattered asks resolve into one line you can ship.
            Releases fall out the other end. Hold the click to calm the noise
            yourself.
          </p>

          <div className="hero-animate hero-fade-up hero-delay-2 mt-9 flex items-center gap-5">
            <Button
              className="group h-12 rounded-full px-7 text-[15px]"
              render={<Link href="/dashboard" prefetch={true} />}
            >
              Start free
              <ArrowRight
                className="ml-1 transition-transform duration-300 group-hover:translate-x-0.5"
                size={15}
              />
            </Button>
            <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
              No credit card
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
