"use client";

import { useMotionValueEvent, useScroll } from "motion/react";
import { useRef, useState } from "react";

import { H2 } from "@/components/ui/typography";
import LoopRail from "../mockups/loop/loop-rail";
import { LOOP_SCENES } from "../mockups/loop/loop-scenes";
import LoopStage from "../mockups/loop/loop-stage";
import LoopTimeline from "../mockups/loop/loop-timeline";

const STEP_HEIGHT_VH = 72;
const HYSTERESIS = 0.14;

function stepFrom(raw: number, current: number): number {
  const forward = Math.min(
    LOOP_SCENES.length - 1,
    Math.floor(raw - HYSTERESIS)
  );
  const backward = Math.max(0, Math.floor(raw + HYSTERESIS));
  if (forward > current) {
    return forward;
  }
  return backward < current ? backward : current;
}

export default function LandingLoop() {
  const track = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const { scrollYProgress } = useScroll({
    offset: ["start start", "end end"],
    target: track,
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setStep((current) => stepFrom(value * LOOP_SCENES.length, current));
  });

  return (
    <section className="waterline relative">
      <div
        className="relative"
        ref={track}
        style={{ height: `${LOOP_SCENES.length * STEP_HEIGHT_VH}svh` }}
      >
        <div className="sticky top-0 flex h-svh items-center overflow-hidden">
          <LoopRail progress={scrollYProgress} step={step} />

          <div className="mx-auto grid w-full max-w-280 grid-cols-1 gap-8 pr-5 pl-11 sm:pr-8 sm:pl-16 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-center lg:gap-16">
            <div className="flex flex-col gap-8">
              <H2 className="text-balance text-[30px] sm:text-[36px] lg:text-[40px]">
                One request, all the way through.
              </H2>
              <LoopTimeline step={step} />
            </div>

            <LoopStage step={step} />
          </div>
        </div>
      </div>
    </section>
  );
}
