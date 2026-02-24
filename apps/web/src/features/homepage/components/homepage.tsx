"use client";

import CTA from "./cta";
import Footer from "./footer";
import Hero from "./hero";
import HowItWorks from "./how-it-works";
import LiveDemo from "./live-demo";
import Navbar from "./navbar";
import Pricing from "./pricing";
import ProductTour from "./product-tour";

export default function Homepage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ProductTour />
        <HowItWorks />
        <LiveDemo />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
