import Link from "next/link";
import { AnimateOnView } from "@/components/animate-on-view";
import { ArrowRight } from "@/components/phosphor-icons";
import { Button } from "@/components/ui/button";

export default function LandingCTA() {
  return (
    <section className="bg-olive-950 py-24 sm:py-32 dark:bg-[#0f0e0b]">
      <div className="mx-auto max-w-300 px-5 sm:px-8">
        <AnimateOnView className="max-w-160">
          <h2 className="mb-8 font-display text-[clamp(2rem,5vw,3.5rem)] text-olive-100 leading-[1.1] tracking-[-0.02em]">
            Stop guessing what to build next.
          </h2>
          <Link href="/dashboard">
            <Button className="h-12 rounded-full bg-olive-100 px-7 text-[15px] text-olive-950 hover:bg-olive-50">
              See your feedback board
              <ArrowRight className="ml-1.5" size={16} />
            </Button>
          </Link>
        </AnimateOnView>
      </div>
    </section>
  );
}
