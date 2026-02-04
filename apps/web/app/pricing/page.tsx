import type { Metadata } from "next";
import Link from "next/link";

import Pricing from "@/features/homepage/components/pricing";

export const metadata: Metadata = {
  title: "Pricing | Reflet",
  description:
    "Simple, transparent pricing for teams of all sizes. Start free and scale as you grow.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <Link
          className="text-muted-foreground text-sm hover:text-foreground"
          href="/"
        >
          &larr; Back to Reflet
        </Link>
      </header>
      <Pricing />
    </div>
  );
}
