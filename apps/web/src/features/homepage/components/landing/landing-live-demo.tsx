"use client";

/*
 * Live Demo — embedded iframe of Reflet's real feedback board.
 * Trust through transparency: real product, real data, real usage.
 */

import { ArrowSquareOut } from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import { useCallback, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export default function LandingLiveDemo() {
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  const iframeRef = useCallback((node: HTMLIFrameElement | null) => {
    if (node) {
      node.addEventListener("load", () => setIsLoaded(true));
    }
  }, []);

  return (
    <section
      className="relative overflow-hidden bg-[#f0efea] py-24 sm:py-32 dark:bg-[#151412]"
      ref={ref}
    >
      <div className="mx-auto max-w-300 px-5 sm:px-8">
        <motion.div
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
        >
          <span className="mb-3 block font-semibold text-[11px] text-olive-600 uppercase tracking-[0.15em] dark:text-olive-400">
            Try it live
          </span>
          <h2 className="mb-4 font-display text-[clamp(1.8rem,4vw,3rem)] text-olive-950 leading-[1.1] tracking-[-0.02em] dark:text-olive-100">
            See Reflet in action
          </h2>
          <p className="mx-auto max-w-120 text-[15px] text-muted-foreground leading-relaxed sm:text-[17px]">
            This is our real feedback board. Browse feature requests, upvote
            ideas, and explore the roadmap — all live.
          </p>
        </motion.div>

        <motion.div
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="relative overflow-hidden rounded-2xl border border-[#e8e6e1] shadow-xl dark:border-[#ffffff0d]"
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.15, duration: 0.6, ease: EASE_OUT_EXPO }}
        >
          {!isLoaded && (
            <Skeleton className="absolute inset-0 h-125 rounded-2xl sm:h-150 lg:h-175" />
          )}
          <iframe
            className="h-125 w-full bg-[#faf9f7] sm:h-150 lg:h-175 dark:bg-[#1e1d1a]"
            loading="lazy"
            ref={iframeRef}
            src="https://www.reflet.app/reflet"
            title="Reflet feedback board — live demo"
          />
        </motion.div>

        <div className="mt-4 flex justify-end">
          <a
            className="inline-flex items-center gap-1.5 font-medium text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            href="https://www.reflet.app/reflet"
            rel="noopener noreferrer"
            target="_blank"
          >
            Open in a new tab
            <ArrowSquareOut size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}
