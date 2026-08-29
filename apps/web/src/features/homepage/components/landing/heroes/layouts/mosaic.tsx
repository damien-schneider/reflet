import Link from "next/link";

import { ArrowRight } from "@/components/phosphor-icons";
import { Button } from "@/components/ui/button";

import GpuCanvas from "../gpu-canvas";
import { MOSAIC_CLUSTERS, MOSAIC_CORE, MOSAIC_SHADER } from "../shaders/mosaic";

function labelTop(cluster: (typeof MOSAIC_CLUSTERS)[number]): string {
  const above = cluster.y > MOSAIC_CORE.y;
  const offset = cluster.sigma + 0.055;
  const y = above ? cluster.y + offset : cluster.y - offset;
  return `${((1 - y) * 100).toFixed(1)}%`;
}

export default function HeroMosaic() {
  return (
    <section className="relative flex min-h-dvh flex-col overflow-hidden">
      <GpuCanvas
        className="pointer-events-none absolute inset-0 h-full w-full"
        shader={MOSAIC_SHADER}
      />

      {MOSAIC_CLUSTERS.map((cluster) => (
        <span
          className="hero-animate hero-fade-up hero-delay-3 absolute hidden w-40 -translate-x-1/2 -translate-y-1/2 text-center lg:block"
          key={cluster.label}
          style={{
            left: `${cluster.x * 100}%`,
            top: labelTop(cluster),
          }}
        >
          <span className="block font-display text-[15px] text-olive-950 leading-tight dark:text-olive-100">
            {cluster.label}
          </span>
          <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
            {cluster.meta}
          </span>
        </span>
      ))}

      <span
        className="hero-animate hero-fade-up hero-delay-3 absolute hidden -translate-x-1/2 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em] lg:block"
        style={{
          left: `${MOSAIC_CORE.x * 100}%`,
          top: `${((1 - MOSAIC_CORE.y) * 100 + 9.5).toFixed(1)}%`,
        }}
      >
        Your board
      </span>

      <div className="relative mx-auto w-full max-w-[92rem] flex-1 px-5 pt-[clamp(5rem,14svh,8rem)] sm:px-8 lg:px-0">
        <div className="max-w-xs lg:absolute lg:top-[37%] lg:left-[5%]">
          <h1 className="hero-animate hero-fade-up hero-delay-0 font-display text-[clamp(1.9rem,2.6vw,2.4rem)] text-olive-950 leading-[1.1] tracking-[-0.02em] dark:text-olive-100">
            118 reports. Eight requests.
          </h1>

          <p className="hero-animate hero-fade-up hero-delay-1 mt-4 text-[15px] text-foreground/70 leading-relaxed">
            Reflet reads every report and gathers the duplicates around the work
            that matters. Hold the click — the noise pulls together.
          </p>

          <Button
            className="group hero-animate hero-fade-up hero-delay-2 mt-6 h-11 rounded-full px-6 text-[14px]"
            render={<Link href="/dashboard" prefetch={true} />}
          >
            Start free
            <ArrowRight
              className="ml-1 transition-transform duration-300 group-hover:translate-x-0.5"
              size={14}
            />
          </Button>
        </div>
      </div>
    </section>
  );
}
