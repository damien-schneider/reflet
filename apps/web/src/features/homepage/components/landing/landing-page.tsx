import type { ReactNode } from "react";

import Footer from "../footer";
import Navbar from "../navbar";
import LandingBelowFold from "./landing-below-fold";
import LandingHero from "./landing-hero";

export default function LandingPage({ hero }: { hero?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        className="sr-only rounded-full bg-olive-600 px-4 py-2 font-medium text-[13px] text-olive-50 focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100"
        href="#main"
      >
        Skip to content
      </a>
      <Navbar />
      <main className="flex-1" id="main">
        {hero ?? <LandingHero />}
        <LandingBelowFold />
      </main>
      <Footer />
    </div>
  );
}
