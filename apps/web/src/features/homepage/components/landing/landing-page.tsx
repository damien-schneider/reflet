import dynamic from "next/dynamic";
import { Suspense } from "react";

import Footer from "../footer";
import Navbar from "../navbar";
import LandingHero from "./landing-hero";

const LandingShowcase = dynamic(() => import("./landing-showcase"));
const LandingProductTour = dynamic(() => import("./landing-product-tour"));
const LandingLoop = dynamic(() => import("./landing-loop"));
const LandingBeforeAfter = dynamic(() => import("./landing-before-after"));
const LandingFeatures = dynamic(() => import("./landing-features"));
const LandingLiveDemo = dynamic(() => import("./landing-live-demo"));
const LandingPricing = dynamic(() => import("./landing-pricing"));
const LandingCTA = dynamic(() => import("./landing-cta"));

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* HOOK — striking headline + metrics */}
        <LandingHero />

        {/* PROMISE — interactive product showcase (screenshot moment) */}
        <Suspense>
          <LandingShowcase />
        </Suspense>

        {/* DEPTH — Widget/SDK + AI deep dives */}
        <Suspense>
          <LandingProductTour />
        </Suspense>

        {/* PROOF — how the loop works */}
        <Suspense>
          <LandingLoop />
        </Suspense>

        {/* DEPTH — before / after interactive toggle */}
        <Suspense>
          <LandingBeforeAfter />
        </Suspense>

        {/* DEPTH — feature bento grid with mini-UIs */}
        <Suspense>
          <LandingFeatures />
        </Suspense>

        {/* TRUST — live demo embed */}
        <Suspense>
          <LandingLiveDemo />
        </Suspense>

        {/* DESIRE — pricing */}
        <Suspense>
          <LandingPricing />
        </Suspense>

        {/* CLOSE — final CTA */}
        <Suspense>
          <LandingCTA />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
