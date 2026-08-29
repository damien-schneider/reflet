import Link from "next/link";

import { ArrowBendDownLeft, ArrowRight } from "@/components/phosphor-icons";
import { Button } from "@/components/ui/button";
import MarketingCta, { CTA_SECONDARY_CLASS } from "../marketing/marketing-cta";

export default function LandingClosing() {
  return (
    <MarketingCta
      actions={
        <>
          <Button
            className="group h-11 rounded-full bg-olive-100 px-6 text-[15px] text-olive-950 hover:bg-white"
            render={<Link href="/dashboard" prefetch={true} />}
          >
            Start free
            <ArrowRight
              className="ml-1 transition-transform duration-300 group-hover:translate-x-0.5"
              size={15}
            />
          </Button>
          <Link className={CTA_SECONDARY_CLASS} href="/docs">
            Read the docs
          </Link>
        </>
      }
      note={
        <>
          <ArrowBendDownLeft size={14} />
          Your users already told you. It&apos;s in the board.
        </>
      }
      title="Stop guessing what to build next."
    />
  );
}
