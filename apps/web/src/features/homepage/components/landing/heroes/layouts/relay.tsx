import Link from "next/link";

import {
  ArrowRight,
  ArrowUp,
  BellRinging,
  GitMerge,
  ImageSquare,
  PaperPlaneTilt,
  Sparkle,
  X,
} from "@/components/phosphor-icons";
import { Button } from "@/components/ui/button";

import GpuCanvas from "../gpu-canvas";
import { RELAY_LINE_Y, RELAY_SHADER, RELAY_STOPS } from "../shaders/relay";

const TITLE = "Export the board to CSV";

const CARD_CLASS =
  "w-[min(86vw,19rem)] rounded-2xl border border-border/80 bg-card p-4 min-h-[10rem] flex flex-col justify-center shadow-[0_2px_8px_-2px_rgba(20,18,11,0.06),0_24px_60px_-20px_rgba(20,18,11,0.18)] dark:border-olive-800/70 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_24px_60px_-24px_rgba(0,0,0,0.8)]";

function CardAsk() {
  return (
    <div className={CARD_CLASS}>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold text-[12px] text-foreground">
          Send feedback
        </span>
        <X className="text-muted-foreground" size={11} weight="bold" />
      </div>
      <div className="rounded-lg bg-olive-600/12 px-3 py-2.5 ring-1 ring-olive-600/25 dark:bg-olive-400/14 dark:ring-olive-400/25">
        <span className="block font-semibold text-[13px] text-foreground leading-snug">
          {TITLE}
        </span>
        <span className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <ImageSquare size={11} weight="fill" />
          Screenshot · div.usage-chart
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="flex size-4 items-center justify-center rounded-full bg-olive-900/10 font-bold text-[10px] text-olive-900/70 dark:bg-olive-100/15 dark:text-olive-100/70">
            M
          </span>
          @mira
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-olive-600 px-2.5 py-1 font-medium text-[11px] text-olive-50 dark:bg-olive-400 dark:text-olive-950">
          Send
          <PaperPlaneTilt size={10} weight="fill" />
        </span>
      </div>
    </div>
  );
}

function CardMerge() {
  return (
    <div className={CARD_CLASS}>
      <div className="flex items-start gap-3">
        <span className="flex shrink-0 flex-col items-center gap-0.5 rounded-md border border-olive-600/35 px-1.5 py-1 font-mono text-[11px] text-olive-700 tabular-nums leading-none dark:border-olive-400/35 dark:text-olive-300">
          <ArrowUp size={9} weight="bold" />
          24
        </span>
        <div className="min-w-0 flex-1">
          <span className="block font-semibold text-[13px] text-foreground leading-snug">
            {TITLE}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex h-5 items-center gap-1 rounded-sm bg-olive-600/15 px-2 font-semibold text-[11px] text-olive-700 dark:bg-olive-400/20 dark:text-olive-200">
              <Sparkle size={9} weight="fill" />
              Exports
            </span>
            <span className="inline-flex h-5 items-center rounded-sm bg-olive-900/6 px-2 font-semibold text-[11px] text-muted-foreground dark:bg-olive-100/8">
              High priority
            </span>
          </span>
        </div>
      </div>
      <div className="mt-3 border-olive-600/15 border-t pt-2.5 dark:border-olive-400/15">
        <span className="flex items-center gap-1.5 font-medium text-[11px] text-olive-700 dark:text-olive-300">
          <GitMerge size={11} />3 duplicates merged into this thread
        </span>
      </div>
    </div>
  );
}

function CardShip() {
  return (
    <div className={CARD_CLASS}>
      <span className="flex items-center gap-1.5 font-semibold text-[11px] text-olive-700 dark:text-olive-300">
        <BellRinging size={11} weight="fill" />
        Shipped in v3.2
      </span>
      <span className="mt-2 block font-semibold text-[13px] text-foreground leading-snug">
        {TITLE}
      </span>
      <span className="mt-2.5 block border-olive-600/15 border-t pt-2.5 text-[11px] text-muted-foreground dark:border-olive-400/15">
        24 voters notified · changelog posted
      </span>
    </div>
  );
}

const BEATS = [
  { Card: CardAsk, caption: "They ask in your app", delay: "hero-delay-1" },
  {
    Card: CardMerge,
    caption: "Reflet merges the duplicates",
    delay: "hero-delay-2",
  },
  { Card: CardShip, caption: "Voters hear back", delay: "hero-delay-3" },
] as const;

export default function HeroRelay() {
  return (
    <section className="relative flex min-h-dvh flex-col overflow-hidden">
      <GpuCanvas
        className="pointer-events-none absolute inset-0 h-full w-full"
        shader={RELAY_SHADER}
      />

      <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center px-5 pt-[clamp(4rem,9svh,5.5rem)] text-center sm:px-8">
        <h1 className="hero-animate hero-fade-up hero-delay-0 text-balance font-display text-[clamp(2.3rem,3.8vw,3.4rem)] text-olive-950 leading-[1.0] tracking-[-0.03em] dark:text-olive-100">
          One request, ask to shipped.
        </h1>

        <p className="hero-animate hero-fade-up hero-delay-1 mt-5 max-w-lg text-[16px] text-foreground/70 leading-relaxed">
          The widget catches it, the board ranks it, the changelog answers it —
          the same thread the whole way.
        </p>

        <Button
          className="group hero-animate hero-fade-up hero-delay-2 mt-7 h-11 rounded-full px-6 text-[15px]"
          render={<Link href="/dashboard" prefetch={true} />}
        >
          Start free
          <ArrowRight
            className="ml-1 transition-transform duration-300 group-hover:translate-x-0.5"
            size={15}
          />
        </Button>
      </div>

      <div className="relative z-10 mx-auto mt-12 flex w-full flex-col items-center gap-8 px-5 pb-16 lg:contents">
        {BEATS.map((beat, index) => (
          <div
            className={`hero-animate hero-fade-up ${beat.delay} lg:absolute lg:-translate-x-1/2 lg:-translate-y-1/2`}
            key={beat.caption}
            style={{
              left: `${RELAY_STOPS[index] * 100}%`,
              top: `${(1 - RELAY_LINE_Y) * 100}%`,
            }}
          >
            <beat.Card />
            <span className="mt-3 block text-center font-mono text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
              {`0${index + 1}`} · {beat.caption}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
