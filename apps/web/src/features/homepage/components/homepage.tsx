"use client";

import CTA from "./cta";
import Features from "./features";
import Footer from "./footer";
import Hero from "./hero";
import Navbar from "./navbar";
import Pricing from "./pricing";
import Testimonials from "./testimonials";

export default function Homepage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <Testimonials />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
