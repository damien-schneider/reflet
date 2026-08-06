"use client";

import dynamic from "next/dynamic";

const LandingShowcase = dynamic(() => import("./landing-showcase"), {
  ssr: false,
});
const LandingProductTour = dynamic(() => import("./landing-product-tour"), {
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
      <LandingPricing />
      <LandingCTA />
    </>
  );
}
