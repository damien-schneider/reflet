"use client";

import dynamic from "next/dynamic";

const LandingShowcase = dynamic(() => import("./landing-showcase"), {
  ssr: false,
});
const LandingProductTour = dynamic(() => import("./landing-product-tour"), {
  ssr: false,
});
const LandingLoop = dynamic(() => import("./landing-loop"), { ssr: false });
const LandingBeforeAfter = dynamic(() => import("./landing-before-after"), {
  ssr: false,
});
const LandingFeatures = dynamic(() => import("./landing-features"), {
  ssr: false,
});
const LandingLiveDemo = dynamic(() => import("./landing-live-demo"), {
  ssr: false,
});
const LandingPricing = dynamic(() => import("./landing-pricing"), {
  ssr: false,
});
const LandingCTA = dynamic(() => import("./landing-cta"), { ssr: false });

export default function LandingBelowFold() {
  return (
    <>
      <LandingShowcase />
      <LandingProductTour />
      <LandingLoop />
      <LandingBeforeAfter />
      <LandingFeatures />
      <LandingLiveDemo />
      <LandingPricing />
      <LandingCTA />
    </>
  );
}
