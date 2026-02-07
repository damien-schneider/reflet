"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import { useCallback, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { H2, Lead, Text } from "@/components/ui/typography";

export default function LiveDemo() {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleIframeRef = useCallback((node: HTMLIFrameElement | null) => {
    if (node) {
      node.addEventListener("load", () => setIsLoaded(true));
    }
  }, []);

  return (
    <section className="bg-background py-24" id="demo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Text className="mb-4" variant="overline">
          Try it live
        </Text>
        <H2 className="mb-6" variant="section">
          See Reflet in action
        </H2>
        <Lead className="mb-12 max-w-2xl">
          This is our real feedback board, powered by Reflet. Browse feature
          requests, upvote ideas, and explore the roadmap — all live.
        </Lead>

        <div className="relative overflow-hidden rounded-2xl border border-border shadow-xl">
          {!isLoaded && (
            <Skeleton className="absolute inset-0 h-[500px] rounded-2xl sm:h-[600px] lg:h-[700px]" />
          )}
          <iframe
            className="h-[500px] w-full sm:h-[600px] lg:h-[700px]"
            loading="lazy"
            ref={handleIframeRef}
            src="https://www.reflet.app/reflet"
            title="Reflet feedback board"
          />
        </div>

        <div className="mt-4 flex justify-end">
          <a
            className="inline-flex items-center gap-1.5 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
            href="https://www.reflet.app/reflet"
            rel="noopener noreferrer"
            target="_blank"
          >
            Open in a new tab
            <ArrowSquareOut size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}
