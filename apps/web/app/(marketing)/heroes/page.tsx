import Link from "next/link";

import { HERO_PROPOSALS } from "@/features/homepage/components/landing/heroes/proposals";

export default function HeroesIndex() {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 pt-32 pb-28 sm:px-8">
      <h1 className="font-display text-[clamp(2.2rem,4vw,3.2rem)] text-olive-950 leading-[1.05] tracking-[-0.03em] dark:text-olive-100">
        Seven heroes, one product story each.
      </h1>
      <p className="mt-5 max-w-lg text-[16px] text-foreground/70 leading-relaxed">
        Each one draws a beat of the Reflet loop in WebGPU — collect, merge,
        rank, ship, notify. Open one, move the cursor, click, and switch from
        the bar at the bottom. Full page drops the same hero into the real
        landing page, sections and all.
      </p>

      <ul className="mt-12 divide-y divide-border/70 border-border/70 border-t border-b">
        {HERO_PROPOSALS.map((proposal, index) => (
          <li key={proposal.slug}>
            <Link
              className="group flex flex-col gap-2 py-6 transition-colors hover:bg-olive-600/4 sm:flex-row sm:items-baseline sm:gap-8"
              href={`/heroes/${proposal.slug}`}
            >
              <span className="w-10 shrink-0 font-mono text-[11px] text-olive-700 tabular-nums dark:text-olive-300">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="w-32 shrink-0 font-display text-[22px] text-olive-950 leading-tight dark:text-olive-100">
                {proposal.name}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] text-foreground/80">
                  {proposal.gpu}
                </span>
                <span className="mt-1 block text-[13px] text-muted-foreground">
                  {proposal.layout}
                </span>
              </span>
            </Link>
            <Link
              className="mb-6 inline-block font-mono text-[11px] text-olive-700 underline-offset-4 hover:underline sm:ml-[10.5rem] dark:text-olive-300"
              href={`/hero-preview/${proposal.slug}`}
            >
              Full page →
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
