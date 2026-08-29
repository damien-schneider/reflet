import type { ReactNode } from "react";

import { RefletArc } from "@/components/reflet-mark";
import { cn } from "@/lib/utils";

const HEADLINE_CLASS =
  "font-display text-balance text-[clamp(2.1rem,5.2vw,4rem)] leading-[1.08] tracking-[-0.018em]";

export const CTA_PRIMARY_CLASS =
  "flex h-11 items-center rounded-full bg-olive-100 px-6 font-medium text-[15px] text-olive-950 transition-colors hover:bg-white";

export const CTA_SECONDARY_CLASS =
  "flex h-11 items-center rounded-full border border-olive-100/20 px-5 font-medium text-[15px] text-olive-100/80 transition-colors hover:border-olive-100/40 hover:text-olive-100";

export default function MarketingCta({
  actions,
  note,
  title,
}: {
  actions: ReactNode;
  note?: ReactNode;
  title: ReactNode;
}) {
  return (
    <section className="dark waterline relative overflow-hidden bg-olive-950 pt-48 pb-24 sm:pt-64 sm:pb-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(ellipse_50%_45%_at_50%_0%,color-mix(in_oklch,var(--color-olive-400)_26%,transparent),transparent)]" />
      <div className="paper-grain pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-screen" />

      <div className="relative mx-auto max-w-220 px-5 text-center sm:px-8">
        <div className="relative inline-block">
          <RefletArc className="pointer-events-none absolute top-full left-1/2 hidden w-[min(46rem,96vw)] -translate-x-1/2 -translate-y-full text-olive-200 opacity-50 [mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)] sm:block [html.dark_&]:opacity-75" />

          {note && (
            <p className="relative mb-7 flex items-center justify-center gap-2.5 text-[15px] text-olive-100/75">
              {note}
            </p>
          )}

          <h2 className={cn(HEADLINE_CLASS, "relative pb-4 text-olive-100")}>
            {title}
          </h2>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-3 sm:mt-20">
            {actions}
          </div>
        </div>
      </div>
    </section>
  );
}
