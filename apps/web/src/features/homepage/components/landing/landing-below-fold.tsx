"use client";

import dynamic from "next/dynamic";

const LandingLoop = dynamic(() => import("./sections/loop"));
const LandingDeveloper = dynamic(() => import("./sections/developer"));
const LandingPricing = dynamic(() => import("./sections/pricing"));
const LandingCTA = dynamic(() => import("./landing-closing"));

export default function LandingBelowFold() {
  return (
    <>
      <LandingLoop />
      <LandingDeveloper />
      <LandingPricing />
      <LandingCTA />
    </>
  );
}
