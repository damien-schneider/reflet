"use client";

import NumberFlow from "@number-flow/react";
import { ArrowUp, Sparkle } from "@phosphor-icons/react";
import { motion, type Transition, useReducedMotion } from "motion/react";
import { createContext, type ReactNode, useContext } from "react";

import { EASE_OUT_EXPO } from "@/features/homepage/lib/motion";
import { cn } from "@/lib/utils";

import { useFollowedRequest } from "../../board-store";

const MORPH: Transition = {
  damping: 26,
  mass: 0.9,
  stiffness: 170,
  type: "spring",
};
const INSTANT: Transition = { duration: 0 };

const SpacerContext = createContext(false);

export function LoopSpacerLayer({ children }: { children: ReactNode }) {
  return <SpacerContext value={true}>{children}</SpacerContext>;
}

function useSpacer(): boolean {
  return useContext(SpacerContext);
}

export function useMorph(): Transition {
  return useReducedMotion() ? INSTANT : MORPH;
}

export function useEnter(): (delay: number, duration?: number) => Transition {
  const reduceMotion = useReducedMotion();

  return (delay, duration = 0.35) =>
    reduceMotion ? INSTANT : { delay, duration, ease: EASE_OUT_EXPO };
}

export function LoopCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const spacer = useSpacer();
  const morph = useMorph();

  return (
    <motion.div
      className={cn(
        "bg-olive-600/12 text-foreground ring-1 ring-olive-600/25 dark:bg-olive-400/14 dark:ring-olive-400/25",
        className,
        spacer ? "invisible" : "visible"
      )}
      layout={!spacer}
      layoutId={spacer ? undefined : "loop-card"}
      style={{ borderRadius: 12 }}
      transition={morph}
    >
      {children}
    </motion.div>
  );
}

export function LoopRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const spacer = useSpacer();
  const morph = useMorph();

  return (
    <motion.div className={className} layout={!spacer} transition={morph}>
      {children}
    </motion.div>
  );
}

export function LoopBody({
  children,
  className,
  delay = 0.2,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const spacer = useSpacer();
  const morph = useMorph();
  const enter = useEnter();

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className={className}
      initial={{ opacity: spacer ? 1 : 0 }}
      layout={!spacer}
      transition={{ layout: morph, opacity: enter(delay, 0.3) }}
    >
      {children}
    </motion.div>
  );
}

export function LoopTitle({
  className,
  size,
}: {
  className?: string;
  size: number;
}) {
  const { typed } = useFollowedRequest();
  const spacer = useSpacer();
  const morph = useMorph();

  return (
    <motion.span
      className={cn(
        "block text-balance font-semibold text-current leading-snug tracking-tight",
        className
      )}
      layout={spacer ? false : "position"}
      layoutId={spacer ? undefined : "loop-title"}
      style={{ fontSize: size }}
      transition={morph}
    >
      {typed}
    </motion.span>
  );
}

export function LoopTag({ className }: { className?: string }) {
  const { item } = useFollowedRequest();
  const spacer = useSpacer();
  const morph = useMorph();

  return (
    <motion.span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-sm bg-olive-600/15 px-2 font-semibold text-[11px] text-olive-700 dark:bg-olive-400/20 dark:text-olive-200",
        className
      )}
      layout={spacer ? false : "position"}
      layoutId={spacer ? undefined : "loop-tag"}
      transition={morph}
    >
      <Sparkle size={9} weight="fill" />
      {item.tags[0]?.label ?? "Board"}
    </motion.span>
  );
}

export function LoopVotes({
  className,
  count,
}: {
  className?: string;
  count: number;
}) {
  const spacer = useSpacer();
  const morph = useMorph();

  return (
    <motion.span
      className={cn(
        "flex shrink-0 flex-col items-center gap-0.5 rounded-md border border-olive-600/35 px-1.5 py-1 font-mono text-[11px] text-olive-700 tabular-nums leading-none dark:border-olive-400/35 dark:text-olive-300",
        className
      )}
      layout={spacer ? false : "position"}
      layoutId={spacer ? undefined : "loop-votes"}
      transition={morph}
    >
      <ArrowUp size={9} weight="bold" />
      {spacer ? count : <NumberFlow value={count} />}
    </motion.span>
  );
}

export function LoopAuthor({ className }: { className?: string }) {
  const { item } = useFollowedRequest();
  const spacer = useSpacer();
  const morph = useMorph();

  return (
    <motion.span
      className={cn(
        "flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground",
        className
      )}
      layout={spacer ? false : "position"}
      layoutId={spacer ? undefined : "loop-author"}
      transition={morph}
    >
      <span className="flex size-4 items-center justify-center rounded-full bg-olive-900/10 font-bold text-[10px] text-olive-900/70 dark:bg-olive-100/15 dark:text-olive-100/70">
        {item.authorInitial}
      </span>
      {item.author}
    </motion.span>
  );
}
