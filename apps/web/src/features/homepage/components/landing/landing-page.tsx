"use client";

import { lazy, Suspense } from "react";

import Footer from "../footer";
import Navbar from "../navbar";
import LandingHero from "./landing-hero";

const LandingShowcase = lazy(() => import("./landing-showcase"));
const LandingProductTour = lazy(() => import("./landing-product-tour"));
const LandingLoop = lazy(() => import("./landing-loop"));
const LandingBeforeAfter = lazy(() => import("./landing-before-after"));
const LandingFeatures = lazy(() => import("./landing-features"));
const LandingLiveDemo = lazy(() => import("./landing-live-demo"));
const LandingPricing = lazy(() => import("./landing-pricing"));
const LandingCTA = lazy(() => import("./landing-cta"));

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
